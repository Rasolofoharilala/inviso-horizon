package com.inviso.horizon.product;

import java.math.BigDecimal;

// Identifiant opaque : un identifiant Sage n'est pas nécessairement numérique.
public record ProductView(String id, String reference, String name,
                          String category, BigDecimal price) {
}
