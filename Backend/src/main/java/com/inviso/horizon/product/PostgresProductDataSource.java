package com.inviso.horizon.product;

import com.inviso.horizon.data.BusinessSource;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class PostgresProductDataSource implements ProductDataSource {
    private final ProductRepository repository;

    public PostgresProductDataSource(ProductRepository repository) {
        this.repository = repository;
    }

    @Override
    public BusinessSource source() { return BusinessSource.POSTGRES; }

    @Override
    @Transactional(readOnly = true)
    public ProductPage findAll(int page, int size) {
        var slice = repository.findAllByOrderByIdAsc(PageRequest.of(page, size));
        var items = slice.getContent().stream().map(product -> new ProductView(
                product.getId().toString(), product.getReference(), product.getName(),
                product.getCategory(), product.getPrice())).toList();
        return new ProductPage(source().code(), items, page, size, slice.hasNext());
    }
}
