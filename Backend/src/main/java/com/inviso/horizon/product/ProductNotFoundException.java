package com.inviso.horizon.product;

public class ProductNotFoundException extends RuntimeException {
    public ProductNotFoundException() { super("Produit introuvable."); }
}
