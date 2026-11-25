package com.inviso.horizon.product;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/** Corps complet pour une création ou un remplacement (PUT). */
public record ProductInput(
        @NotBlank @Size(max = 80) String reference,
        @NotBlank @Size(max = 150) String name,
        @NotBlank @Size(max = 100) String category,
        @NotNull @DecimalMin("0.00") @Digits(integer = 13, fraction = 2) BigDecimal price) {
    public ProductInput {
        reference = reference == null ? null : reference.strip();
        name = name == null ? null : name.strip();
        category = category == null ? null : category.strip();
    }
}
