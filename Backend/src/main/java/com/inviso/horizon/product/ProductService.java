package com.inviso.horizon.product;

import com.inviso.horizon.data.BusinessDataProperties;
import com.inviso.horizon.data.BusinessSource;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ProductService {
    private final ProductDataSource adapter;

    public ProductService(BusinessDataProperties properties, List<ProductDataSource> adapters) {
        var matching = adapters.stream()
                .filter(candidate -> candidate.source() == properties.source()).toList();
        if (matching.size() != 1) {
            throw new IllegalStateException("Une seule implémentation est requise pour " + properties.source());
        }
        this.adapter = matching.getFirst();
    }

    public BusinessSource source() { return adapter.source(); }

    public ProductPage findAll(int page, int size) {
        if (page < 0 || page > 100000 || size < 1 || size > 100) {
            throw new IllegalArgumentException("page doit être compris entre 0 et 100000 et size entre 1 et 100.");
        }
        return adapter.findAll(page, size);
    }
}
