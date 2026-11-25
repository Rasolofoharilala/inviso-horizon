package com.inviso.horizon.livestock;

import java.math.BigDecimal;
import java.time.LocalDate;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class LivestockLotTests {
    @Test void totalIncludesBothSexesWithoutIntegerOverflow() {
        var input = new LotInput("lot-1", "Premier lot", new BigDecimal("2147483647"), new BigDecimal("2147483647"), null, LocalDate.of(2026, 1, 1));
        assertEquals(4294967294L, new LivestockLot(input).getTotal());
        assertEquals("LOT-1", input.reference());
    }
    @Test void anEmptyLotIsValid() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var input = new LotInput("LOT-VIDE", "Lot vide", BigDecimal.ZERO, BigDecimal.ZERO, null, LocalDate.of(2026, 1, 1));
            assertTrue(factory.getValidator().validate(input).isEmpty());
            assertEquals(0, new LivestockLot(input).getTotal());
        }
    }
    @Test void negativeFractionalOrMissingCountsAreInvalid() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertFalse(validator.validate(new LotInput("LOT-1", "Lot", new BigDecimal("-1"), BigDecimal.ZERO, null, LocalDate.of(2026, 1, 1))).isEmpty());
            assertFalse(validator.validate(new LotInput("LOT-1", "Lot", new BigDecimal("1.5"), BigDecimal.ZERO, null, LocalDate.of(2026, 1, 1))).isEmpty());
            assertFalse(validator.validate(new LotInput("LOT-1", "Lot", null, BigDecimal.ZERO, null, LocalDate.of(2026, 1, 1))).isEmpty());
            assertFalse(validator.validate(new LotInput("LOT-1", "Lot", new BigDecimal("2147483648"), BigDecimal.ZERO, null, LocalDate.of(2026, 1, 1))).isEmpty());
        }
    }
}
