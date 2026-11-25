package com.inviso.horizon.product;

import java.util.List;

public record ProductPage(String source, List<ProductView> items,
                          int page, int size, boolean hasNext) {
    public ProductPage { items = List.copyOf(items); }
}
