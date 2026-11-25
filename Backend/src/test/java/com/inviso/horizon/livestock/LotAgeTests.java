package com.inviso.horizon.livestock;

import java.time.*;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class LotAgeTests {
    @Test void firstWeekIncludesDayOneThroughDaySeven() {
        var start = LocalDate.of(2026, 11, 1);
        assertEquals(new LotAge(1, 1), LotAge.at(start, start));
        assertEquals(new LotAge(7, 1), LotAge.at(start, start.plusDays(6)));
        assertEquals(new LotAge(8, 2), LotAge.at(start, start.plusDays(7)));
        assertEquals(new LotAge(14, 2), LotAge.at(start, start.plusDays(13)));
    }
    @Test void monthYearAndLeapDayAreCalendarDays() {
        assertEquals(new LotAge(8, 2), LotAge.at(LocalDate.of(2026, 12, 28), LocalDate.of(2027, 1, 4)));
        assertEquals(new LotAge(3, 1), LotAge.at(LocalDate.of(2024, 2, 28), LocalDate.of(2024, 3, 1)));
    }
    @Test void dayUsesMadagascarTimezone() {
        var clock = Clock.fixed(Instant.parse("2026-11-25T21:30:00Z"), ZoneId.of("Indian/Antananarivo"));
        assertEquals(new LotAge(2, 1), LotAge.at(LocalDate.of(2026, 11, 25), LocalDate.now(clock)));
    }
    @Test void futureAndMissingDatesAreRejectedBeforeWriting() {
        var repository = mock(LotRepository.class);
        var clock = Clock.fixed(Instant.parse("2026-11-25T07:00:00Z"), ZoneId.of("Indian/Antananarivo"));
        var service = new LotService(repository, clock, mock(LotLedger.class));
        var future = new LotInput("LOT-1", "Test", BigDecimal.ONE, BigDecimal.ONE, null, LocalDate.of(2026, 11, 26));
        assertEquals(400, assertThrows(ResponseStatusException.class, () -> service.create(future)).getStatusCode().value());
        var missing = new LotInput("LOT-1", "Test", BigDecimal.ONE, BigDecimal.ONE, null, null);
        assertThrows(ResponseStatusException.class, () -> service.create(missing));
        verifyNoInteractions(repository);
    }
}
