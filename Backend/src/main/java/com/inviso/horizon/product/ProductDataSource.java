package com.inviso.horizon.product;

import com.inviso.horizon.data.BusinessSource;

/** Port CRUD, indépendant de JPA et du protocole de Sage X3. */
public interface ProductDataSource {
    BusinessSource source();
    ProductPage findAll(int page, int size);
    ProductView findById(String id);
    ProductView create(ProductInput input);
    ProductView update(String id, ProductInput input);
    void delete(String id);
}
