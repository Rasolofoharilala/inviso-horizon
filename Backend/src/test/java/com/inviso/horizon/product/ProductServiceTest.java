package com.inviso.horizon.product;

import com.inviso.horizon.data.BusinessDataProperties;
import com.inviso.horizon.data.BusinessSource;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProductServiceTest {
    @Test
    void postgresIsDefault() {
        assertEquals(BusinessSource.POSTGRES, new BusinessDataProperties(null).source());
    }

    @Test
    void routesOnlyToSelectedSource() {
        var postgres = mock(ProductDataSource.class);
        when(postgres.source()).thenReturn(BusinessSource.POSTGRES);
        var sage = mock(ProductDataSource.class);
        when(sage.source()).thenReturn(BusinessSource.SAGE_X3);
        var expected = new ProductPage("postgres", List.of(), 0, 20, false);
        when(postgres.findAll(0, 20)).thenReturn(expected);
        var service = new ProductService(new BusinessDataProperties(BusinessSource.POSTGRES), List.of(postgres, sage));
        assertSame(expected, service.findAll(0, 20));
        verify(sage, never()).findAll(anyInt(), anyInt());
    }

    @Test
    void sageDoesNotSilentlyFallBackToPostgres() {
        var service = new ProductService(new BusinessDataProperties(BusinessSource.SAGE_X3),
                List.of(new SageX3ProductDataSource()));
        assertThrows(SageX3UnavailableException.class, () -> service.findAll(0, 20));
    }

    @Test
    void rejectsInvalidPaginationBeforeCallingSource() {
        var service = new ProductService(new BusinessDataProperties(null), List.of(new PostgresStub()));
        assertThrows(IllegalArgumentException.class, () -> service.findAll(-1, 20));
        assertThrows(IllegalArgumentException.class, () -> service.findAll(0, 101));
    }

    @Test
    void rejectsAmbiguousAdapters() {
        assertThrows(IllegalStateException.class, () -> new ProductService(
                new BusinessDataProperties(null), List.of(new PostgresStub(), new PostgresStub())));
    }

    private static class PostgresStub implements ProductDataSource {
        public BusinessSource source() { return BusinessSource.POSTGRES; }
        public ProductPage findAll(int page, int size) { throw new AssertionError("Ne doit pas être appelé"); }
    }
}
