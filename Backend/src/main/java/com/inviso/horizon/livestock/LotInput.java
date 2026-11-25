package com.inviso.horizon.livestock;

import jakarta.validation.constraints.*;
import java.util.Locale;
import java.time.LocalDate;
import java.math.BigDecimal;

public record LotInput(
    @NotBlank @Size(max = 80) String reference,
    @NotBlank @Size(max = 150) String name,
    @NotNull @DecimalMin("0") @DecimalMax("2147483647") @Digits(integer = 10, fraction = 0) BigDecimal maleCount,
    @NotNull @DecimalMin("0") @DecimalMax("2147483647") @Digits(integer = 10, fraction = 0) BigDecimal femaleCount,
    @PositiveOrZero Long version,
    @NotNull LocalDate creationDate) {
    public LotInput {
        reference = reference == null ? null : reference.strip().toUpperCase(Locale.ROOT);
        name = name == null ? null : name.strip();
    }
}
