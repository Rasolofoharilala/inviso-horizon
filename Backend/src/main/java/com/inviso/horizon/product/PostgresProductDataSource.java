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
        var items = slice.getContent().stream().map(PostgresProductDataSource::view).toList();
        return new ProductPage(source().code(), items, page, size, slice.hasNext());
    }
    @Override
    @Transactional(readOnly = true)
    public ProductView findById(String id) { return view(requireProduct(id)); }

    @Override
    @Transactional
    public ProductView create(ProductInput input) {
        return view(repository.saveAndFlush(new Product(input)));
    }

    @Override
    @Transactional
    public ProductView update(String id, ProductInput input) {
        var product = requireProduct(id);
        product.replaceWith(input);
        return view(repository.saveAndFlush(product));
    }

    @Override
    @Transactional
    public void delete(String id) {
        repository.delete(requireProduct(id));
        repository.flush();
    }

    private Product requireProduct(String id) {
        long numericId;
        try {
            numericId = Long.parseLong(id);
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("Identifiant PostgreSQL invalide.");
        }
        if (numericId <= 0) throw new IllegalArgumentException("Identifiant PostgreSQL invalide.");
        return repository.findById(numericId).orElseThrow(ProductNotFoundException::new);
    }

    private static ProductView view(Product product) {
        return new ProductView(product.getId().toString(), product.getReference(),
                product.getName(), product.getCategory(), product.getPrice());
    }
}
