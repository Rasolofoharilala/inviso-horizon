package com.inviso.horizon.livestock;

import java.time.*;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.*;
import jakarta.validation.constraints.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class LotLedger {
    private final JdbcTemplate jdbc;
    private final LotRepository lots;
    private final Clock clock;
    public LotLedger(JdbcTemplate jdbc, LotRepository lots, @Qualifier("livestockClock") Clock clock) {
        this.jdbc = jdbc; this.lots = lots; this.clock = clock;
    }
    public enum Type { ENTRY, MORTALITY, SALE, EXIT }
    public record Input(@NotNull UUID requestId, @NotNull Type type, @NotNull LocalDate effectiveDate,
        @NotNull @DecimalMin("0") @DecimalMax("2147483647") @Digits(integer=10, fraction=0) BigDecimal males,
        @NotNull @DecimalMin("0") @DecimalMax("2147483647") @Digits(integer=10, fraction=0) BigDecimal females,
        @NotBlank @Size(max=500) String reason) { }
    public record Cancellation(@NotBlank @Size(max=500) String reason) { }
    public record Balance(long males, long females, long movements) { }
    public record Movement(String id, String type, LocalDate effectiveDate, long maleDelta, long femaleDelta,
        String reason, Instant recordedAt, String recordedBy, Instant cancelledAt, String cancelledBy,
        String cancellationReason, long maleAfter, long femaleAfter) { }
    public record History(List<Movement> items, int page, int size, long totalElements, long totalPages) { }
    public record Point(LocalDate date, long day, long week, long males, long females, long total) { }
    public record Evolution(LocalDate from, LocalDate to, String interval, List<Point> points) { }

    public Map<Long, Balance> balances(List<Long> ids, LocalDate asOf) {
        if (ids.isEmpty()) return Map.of();
        String placeholders = String.join(",", Collections.nCopies(ids.size(), "?"));
        List<Object> args = new ArrayList<>(); args.add(asOf); args.add(asOf); args.addAll(ids);
        var result = new HashMap<Long, Balance>();
        jdbc.query("SELECT lot_id, count(*) AS n, coalesce(sum(CASE WHEN cancelled_at IS NULL AND effective_date <= ? THEN male_delta ELSE 0 END),0) AS m, coalesce(sum(CASE WHEN cancelled_at IS NULL AND effective_date <= ? THEN female_delta ELSE 0 END),0) AS f FROM lot_movement WHERE lot_id IN (" + placeholders + ") GROUP BY lot_id",
            (org.springframework.jdbc.core.RowCallbackHandler) rs -> result.put(rs.getLong("lot_id"), new Balance(rs.getLong("m"), rs.getLong("f"), rs.getLong("n"))), args.toArray());
        return result;
    }
    public Balance balance(long id, LocalDate asOf) { return balances(List.of(id), asOf).getOrDefault(id, new Balance(0,0,0)); }
    public Balance filteredDeltas(String query, LocalDate asOf) {
        return jdbc.queryForObject("SELECT coalesce(sum(m.male_delta),0) AS m, coalesce(sum(m.female_delta),0) AS f FROM lot_movement m JOIN livestock_lot l ON l.id=m.lot_id WHERE m.cancelled_at IS NULL AND m.effective_date <= ? AND (? = '' OR position(lower(?) in lower(l.reference)) > 0 OR position(lower(?) in lower(l.name)) > 0)",
            (rs, row) -> new Balance(rs.getLong("m"), rs.getLong("f"), 0), asOf, query, query, query);
    }
    private LivestockLot require(long id, boolean lock) {
        return (lock ? lots.findLockedById(id) : lots.findById(id))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lot introuvable."));
    }
    private static final String BALANCES = "SELECT m.*, l.male_count + sum(CASE WHEN m.cancelled_at IS NULL THEN m.male_delta ELSE 0 END) OVER (ORDER BY m.effective_date, m.id) AS male_after, l.female_count + sum(CASE WHEN m.cancelled_at IS NULL THEN m.female_delta ELSE 0 END) OVER (ORDER BY m.effective_date, m.id) AS female_after FROM lot_movement m JOIN livestock_lot l ON l.id=m.lot_id WHERE m.lot_id=?";
    private static Movement movement(ResultSet rs, int row) throws SQLException {
        var cancelled = rs.getTimestamp("cancelled_at");
        return new Movement(rs.getString("id"), rs.getString("movement_type"), rs.getDate("effective_date").toLocalDate(),
            rs.getLong("male_delta"), rs.getLong("female_delta"), rs.getString("reason"), rs.getTimestamp("recorded_at").toInstant(), rs.getString("recorded_by"),
            cancelled == null ? null : cancelled.toInstant(), rs.getString("cancelled_by"), rs.getString("cancellation_reason"), rs.getLong("male_after"), rs.getLong("female_after"));
    }
    @Transactional(readOnly=true)
    public History history(long id, int page, int size, String order) {
        require(id, false);
        if (page < 0 || page > 100000 || size < 1 || size > 100 || (!order.equals("asc") && !order.equals("desc")))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pagination invalide.");
        String direction = order.equals("asc") ? "ASC" : "DESC";
        long count = jdbc.queryForObject("SELECT count(*) FROM lot_movement WHERE lot_id=?", Long.class, id);
        var items = jdbc.query("SELECT * FROM (" + BALANCES + ") ledger ORDER BY effective_date " + direction + ", id " + direction + " LIMIT ? OFFSET ?", LotLedger::movement, id, size, (long) page * size);
        return new History(items, page, size, count, (count + size - 1) / size);
    }
    @Transactional
    public Movement add(long lotId, Input input, String actor) {
        var lot = require(lotId, true); // Sérialise aussi les corrections rétroactives du même lot.
        LocalDate date = input.effectiveDate();
        if (lot.getCreationDate() == null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Renseignez d’abord la date de mise en place du lot.");
        if (date.isBefore(lot.getCreationDate()) || date.isAfter(LocalDate.now(clock)))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La date doit être comprise entre la mise en place et aujourd’hui.");
        long m = input.males().longValueExact(), f = input.females().longValueExact();
        if (m == 0 && f == 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Renseignez au moins un animal.");
        long sign = input.type() == Type.ENTRY ? 1 : -1;
        var previous = jdbc.queryForList("SELECT id FROM lot_movement WHERE lot_id=? AND request_id=?", Long.class, lotId, input.requestId());
        if (!previous.isEmpty()) {
            Movement existing = get(lotId, previous.getFirst());
            if (!existing.type().equals(input.type().name()) || !existing.effectiveDate().equals(date)
                || existing.maleDelta()!=sign*m || existing.femaleDelta()!=sign*f || !existing.reason().equals(input.reason().strip()))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette demande a déjà été utilisée avec d’autres valeurs.");
            return existing;
        }
        Long id = jdbc.queryForObject("INSERT INTO lot_movement(lot_id, request_id, movement_type, effective_date, male_delta, female_delta, reason, recorded_at, recorded_by) VALUES (?,?,?,?,?,?,?,?,?) RETURNING id",
            Long.class, lotId, input.requestId(), input.type().name(), date, sign*m, sign*f, input.reason().strip(), java.sql.Timestamp.from(clock.instant()), actor);
        validateBalances(lotId);
        return get(lotId, id);
    }
    @Transactional
    public Movement cancel(long lotId, long id, String reason, String actor) {
        require(lotId, true);
        int changed = jdbc.update("UPDATE lot_movement SET cancelled_at=?, cancelled_by=?, cancellation_reason=? WHERE lot_id=? AND id=? AND cancelled_at IS NULL",
            java.sql.Timestamp.from(clock.instant()), actor, reason.strip(), lotId, id);
        if (changed == 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "Mouvement introuvable ou déjà annulé.");
        validateBalances(lotId);
        return get(lotId, id);
    }
    private Movement get(long lotId, long id) {
        return jdbc.queryForObject("SELECT * FROM (" + BALANCES + ") ledger WHERE id=?", LotLedger::movement, lotId, id);
    }
    private void validateBalances(long lotId) {
        Boolean invalid = jdbc.queryForObject("SELECT coalesce(bool_or(male_after < 0 OR female_after < 0 OR male_after > 2147483647 OR female_after > 2147483647),false) FROM (" + BALANCES + ") ledger", Boolean.class, lotId);
        if (Boolean.TRUE.equals(invalid)) throw new ResponseStatusException(HttpStatus.CONFLICT,
            "Cette opération rendrait un effectif négatif ou trop élevé dans l’historique. Vérifiez aussi les mouvements ultérieurs.");
    }
    @Transactional(readOnly=true)
    public Evolution evolution(long id, LocalDate from, LocalDate to, String interval) {
        var lot = require(id, false);
        if (lot.getCreationDate() == null) throw new ResponseStatusException(HttpStatus.CONFLICT, "Renseignez la date de mise en place pour afficher l’évolution.");
        LocalDate today = LocalDate.now(clock);
        if (to == null) to = today;
        if (from == null) from = lot.getCreationDate().isAfter(to.minusDays(365)) ? lot.getCreationDate() : to.minusDays(365);
        if (from.isBefore(lot.getCreationDate()) || to.isAfter(today) || from.isAfter(to) || java.time.temporal.ChronoUnit.DAYS.between(from,to) > 3660 || (!interval.equals("day") && !interval.equals("week")))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choisissez une période comprise entre J1 et aujourd’hui, de dix ans maximum.");
        String sql = "WITH dates AS (SELECT d::date AS date FROM generate_series(?::date,?::date,interval '1 day') d), daily AS (SELECT effective_date, sum(male_delta) AS m, sum(female_delta) AS f FROM lot_movement WHERE lot_id=? AND cancelled_at IS NULL GROUP BY effective_date), prior AS (SELECT coalesce(sum(male_delta),0) AS m, coalesce(sum(female_delta),0) AS f FROM lot_movement WHERE lot_id=? AND cancelled_at IS NULL AND effective_date < ?), points AS (SELECT dates.date, ?::date AS start_date, ?::bigint + prior.m + sum(coalesce(daily.m,0)) OVER (ORDER BY dates.date) AS males, ?::bigint + prior.f + sum(coalesce(daily.f,0)) OVER (ORDER BY dates.date) AS females FROM dates CROSS JOIN prior LEFT JOIN daily ON daily.effective_date=dates.date) SELECT * FROM points WHERE ?='day' OR date=? OR date=? OR mod(date-start_date+1,7)=0 ORDER BY date";
        List<Point> points = jdbc.query(sql, (rs,row) -> {
            LocalDate date = rs.getDate("date").toLocalDate();
            var age = LotAge.at(lot.getCreationDate(), date);
            long males = rs.getLong("males"), females = rs.getLong("females");
            return new Point(date, age.day(), age.week(), males, females, males+females);
        }, from, to, id, id, from, lot.getCreationDate(), lot.getMaleCount(), lot.getFemaleCount(), interval, from, to);
        return new Evolution(from,to,interval,points);
    }
}
