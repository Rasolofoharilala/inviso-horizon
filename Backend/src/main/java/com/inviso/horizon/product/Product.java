package com.inviso.horizon.product;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "horizon_product")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 80)
    private String reference;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 100)
    private String category;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal price;

    protected Product() { }

    public Product(ProductInput input) { replaceWith(input); }

    public void replaceWith(ProductInput input) {
        reference = input.reference();
        name = input.name();
        category = input.category();
        price = input.price();
    }

    public Long getId() { return id; }
    public String getReference() { return reference; }
    public String getName() { return name; }
    public String getCategory() { return category; }
    public BigDecimal getPrice() { return price; }
}
