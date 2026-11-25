package com.inviso.horizon.product;

import com.inviso.horizon.data.BusinessSource;

/** Port de lecture, indépendant de JPA et du protocole de Sage X3. */
public interface ProductDataSource {
    BusinessSource source();
    ProductPage findAll(int page, int size);
}
