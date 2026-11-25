package com.inviso.horizon.livestock;

import java.util.List;
import java.time.Clock;
import java.time.LocalDate;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class LotService {
    private final LotRepository repository;
    private final Clock clock;
    private final LotLedger ledger;
    public LotService(LotRepository repository, @Qualifier("livestockClock") Clock clock, LotLedger ledger) {
        this.repository = repository; this.clock = clock; this.ledger = ledger;
    }
    public record LotView(String id, String reference, String name, int maleCount, int femaleCount, long total, long version,
        LocalDate creationDate, Long ageDays, Long ageWeek, LocalDate ageAsOf, int initialMaleCount, int initialFemaleCount, long movementCount, String timeZone) { }
    public record Totals(long lotCount, long maleCount, long femaleCount, long total) { }
    public record LotPage(List<LotView> items, int page, int size, long totalElements, int totalPages, Totals totals, LocalDate ageAsOf, String timeZone) { }
    private LotView view(LivestockLot lot, LocalDate today) { return view(lot,today,ledger.balance(lot.getId(),today)); }
    private LotView view(LivestockLot lot, LocalDate today, LotLedger.Balance balance) {
        LotAge age = lot.getCreationDate() == null ? null : LotAge.at(lot.getCreationDate(), today);
        long males=lot.getMaleCount()+balance.males(), females=lot.getFemaleCount()+balance.females();
        return new LotView(lot.getId().toString(), lot.getReference(), lot.getName(), Math.toIntExact(males), Math.toIntExact(females), males+females, lot.getVersion(),
            lot.getCreationDate(), age == null ? null : age.day(), age == null ? null : age.week(), today, lot.getMaleCount(), lot.getFemaleCount(), balance.movements(), clock.getZone().getId());
    }
    @Transactional(readOnly = true)
    public LotPage list(String query, int page, int size) {
        if (page < 0 || page > 100000 || size < 1 || size > 100 || query.length() > 150)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Pagination ou recherche invalide.");
        LocalDate today = LocalDate.now(clock);
        var result = repository.search(query.strip(), PageRequest.of(page, size, Sort.by("id").descending()));
        var totals = repository.totals(query.strip());
        var deltas=ledger.filteredDeltas(query.strip(),today);
        var balances=ledger.balances(result.getContent().stream().map(LivestockLot::getId).toList(),today);
        return new LotPage(result.getContent().stream().map(lot -> view(lot, today, balances.getOrDefault(lot.getId(),new LotLedger.Balance(0,0,0)))).toList(), page, size,
            result.getTotalElements(), result.getTotalPages(),
            new Totals(totals.getLotCount(), totals.getMaleCount()+deltas.males(), totals.getFemaleCount()+deltas.females(), totals.getMaleCount()+deltas.males()+totals.getFemaleCount()+deltas.females()), today, clock.getZone().getId());
    }
    @Transactional(readOnly = true)
    public LotView get(long id) { return view(require(id), LocalDate.now(clock)); }
    @Transactional
    public LotView create(LotInput input) {
        validateDate(input.creationDate());
        return view(repository.saveAndFlush(new LivestockLot(input)), LocalDate.now(clock));
    }
    @Transactional
    public LotView update(long id, LotInput input) {
        validateDate(input.creationDate());
        var lot = requireLocked(id);
        if (input.version() == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Version du lot requise.");
        if (!input.version().equals(lot.getVersion())) throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce lot a changé. Actualisez avant de le modifier.");
        if (ledger.balance(id,LocalDate.now(clock)).movements()>0 &&
            (input.maleCount().intValueExact()!=lot.getMaleCount() || input.femaleCount().intValueExact()!=lot.getFemaleCount() || !input.creationDate().equals(lot.getCreationDate())))
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Après un mouvement, les effectifs initiaux et J1 sont verrouillés. Ajoutez un mouvement pour changer les effectifs.");
        lot.replace(input);
        return view(repository.saveAndFlush(lot), LocalDate.now(clock));
    }
    @Transactional
    public void delete(long id, long version) {
        var lot = requireLocked(id);
        if (lot.getVersion() != version) throw new ResponseStatusException(HttpStatus.CONFLICT, "Ce lot a changé. Actualisez avant de le supprimer.");
        if (ledger.balance(id,LocalDate.now(clock)).movements()>0) throw new ResponseStatusException(HttpStatus.CONFLICT,"Ce lot possède un historique et ne peut pas être supprimé.");
        repository.delete(lot); repository.flush();
    }
    private void validateDate(LocalDate date) {
        if (date == null || date.isBefore(LocalDate.of(1, 1, 1)) || date.isAfter(LocalDate.now(clock)))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Renseignez une date de mise en place valide, au plus tard aujourd’hui.");
    }
    private LivestockLot requireLocked(long id) {
        return repository.findLockedById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,"Lot introuvable."));
    }
    private LivestockLot require(long id) {
        return repository.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lot introuvable."));
    }
}
