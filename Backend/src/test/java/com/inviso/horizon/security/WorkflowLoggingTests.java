package com.inviso.horizon.security;

import jakarta.servlet.ServletException;
import java.io.IOException;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import static org.junit.jupiter.api.Assertions.*;

class WorkflowLoggingTests {
    @Test void valuesCannotInjectExtraLogLines() {
        assertEquals("admin___fake_event", WorkflowLog.safe("admin\r\n fake_event"));
        assertEquals(80, WorkflowLog.safe("x".repeat(500)).length());
    }
    @Test void arbitraryPathSegmentsAreNeverLogged() {
        assertEquals("/api/other", WorkflowRequestLogFilter.route("/api/secret-value"));
        assertEquals("/api/products/{id}", WorkflowRequestLogFilter.route("/api/products/secret-value"));
    }
    @Test void requestIdIsGeneratedAndPreviousContextIsRestored() throws Exception {
        MDC.put("workflowRequestId", "previous");
        try {
            var request = new MockHttpServletRequest("GET", "/api/auth/me");
            request.addHeader("X-Request-ID", "untrusted");
            var response = new MockHttpServletResponse();
            new WorkflowRequestLogFilter().doFilter(request, response, (req, res) -> {
                assertNotEquals("untrusted", MDC.get("workflowRequestId"));
                assertEquals(response.getHeader("X-Request-ID"), MDC.get("workflowRequestId"));
            });
            assertDoesNotThrow(() -> UUID.fromString(response.getHeader("X-Request-ID")));
            assertEquals("previous", MDC.get("workflowRequestId"));
        } finally { MDC.remove("workflowRequestId"); }
    }
    @Test void failingRequestDoesNotLeakContextToNextRequest() {
        MDC.remove("workflowRequestId");
        assertThrows(ServletException.class, () -> new WorkflowRequestLogFilter().doFilter(
            new MockHttpServletRequest("GET", "/api/products"), new MockHttpServletResponse(),
            (req, res) -> { throw new ServletException("do-not-log-this-message"); }));
        assertNull(MDC.get("workflowRequestId"));
    }
}
