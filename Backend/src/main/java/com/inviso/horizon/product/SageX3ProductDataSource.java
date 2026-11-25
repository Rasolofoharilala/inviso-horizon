package com.inviso.horizon.product;

import com.inviso.horizon.data.BusinessSource;
import org.springframework.stereotype.Component;

@Component
public class SageX3ProductDataSource implements ProductDataSource {
    @Override
    public BusinessSource source() { return BusinessSource.SAGE_X3; }

    @Override
    public ProductPage findAll(int page, int size) {
        // Aucun accès JDBC à Sage, aucune donnée inventée et aucun repli silencieux.
        // Remplacer ici après validation de l'API REST/SOAP et de son mapping.
        throw new SageX3UnavailableException();
    }
    @Override
    public ProductView findById(String id) { throw new SageX3UnavailableException(); }
    @Override
    public ProductView create(ProductInput input) { throw new SageX3UnavailableException(); }
    @Override
    public ProductView update(String id, ProductInput input) { throw new SageX3UnavailableException(); }
    @Override
    public void delete(String id) { throw new SageX3UnavailableException(); }
}
