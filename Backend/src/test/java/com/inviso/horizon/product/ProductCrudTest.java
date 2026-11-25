package com.inviso.horizon.product;

import java.math.BigDecimal;
import java.util.Optional;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProductCrudTest {
    private ProductInput input(String reference) {
        return new ProductInput(reference, "Aliment", "Élevage", new BigDecimal("1200.50"));
    }

    @Test
    void createPersistsAndReturnsAssignedIdentifier() {
        var repository = mock(ProductRepository.class);
        when(repository.saveAndFlush(any(Product.class))).thenAnswer(invocation -> {
            Product product = invocation.getArgument(0);
            ReflectionTestUtils.setField(product, "id", 42L);
            return product;
        });
        var result = new PostgresProductDataSource(repository).create(input(" TEST "));
        assertEquals("42", result.id());
        assertEquals("TEST", result.reference());
        assertEquals(new BigDecimal("1200.50"), result.price());
    }

    @Test
    void updateChangesExistingProductWithoutCreatingAnother() {
        var repository = mock(ProductRepository.class);
        var existing = new Product(input("OLD"));
        ReflectionTestUtils.setField(existing, "id", 42L);
        when(repository.findById(42L)).thenReturn(Optional.of(existing));
        when(repository.saveAndFlush(existing)).thenReturn(existing);
        var result = new PostgresProductDataSource(repository).update("42", input("NEW"));
        assertEquals("42", result.id());
        assertEquals("NEW", existing.getReference());
        verify(repository).saveAndFlush(existing);
    }

    @Test
    void missingProductReturnsDomainErrorAndIsNotDeleted() {
        var repository = mock(ProductRepository.class);
        when(repository.findById(42L)).thenReturn(Optional.empty());
        var adapter = new PostgresProductDataSource(repository);
        assertThrows(ProductNotFoundException.class, () -> adapter.findById("42"));
        assertThrows(ProductNotFoundException.class, () -> adapter.update("42", input("NEW")));
        assertThrows(ProductNotFoundException.class, () -> adapter.delete("42"));
        verify(repository, never()).delete(any(Product.class));
    }

    @Test
    void deleteFlushesExistingProduct() {
        var repository = mock(ProductRepository.class);
        var product = new Product(input("TEST"));
        when(repository.findById(42L)).thenReturn(Optional.of(product));
        new PostgresProductDataSource(repository).delete("42");
        verify(repository).delete(product);
        verify(repository).flush();
    }

    @Test
    void invalidIdentifierNeverReachesRepository() {
        var repository = mock(ProductRepository.class);
        var adapter = new PostgresProductDataSource(repository);
        assertThrows(IllegalArgumentException.class, () -> adapter.findById("abc"));
        assertThrows(IllegalArgumentException.class, () -> adapter.findById("0"));
        verifyNoInteractions(repository);
    }

    @Test
    void validatesRequiredFieldsAndPricePrecision() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertTrue(validator.validate(input("TEST")).isEmpty());
            assertFalse(validator.validate(new ProductInput(" ", "", "", null)).isEmpty());
            assertFalse(validator.validate(new ProductInput("T", "N", "C", new BigDecimal("-1"))).isEmpty());
            assertFalse(validator.validate(new ProductInput("T", "N", "C", new BigDecimal("1.001"))).isEmpty());
        }
    }

    @Test
    void sageWritesFailExplicitly() {
        var sage = new SageX3ProductDataSource();
        assertThrows(SageX3UnavailableException.class, () -> sage.create(input("T")));
        assertThrows(SageX3UnavailableException.class, () -> sage.update("42", input("T")));
        assertThrows(SageX3UnavailableException.class, () -> sage.delete("42"));
    }
}
