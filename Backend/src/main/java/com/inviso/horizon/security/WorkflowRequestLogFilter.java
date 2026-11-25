package com.inviso.horizon.security;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.*;
import org.springframework.web.filter.OncePerRequestFilter;

/** Installé uniquement dans la chaîne Spring Security, avant les contrôles d'accès. */
final class WorkflowRequestLogFilter extends OncePerRequestFilter {
    private static final Logger LOG = LoggerFactory.getLogger("horizon.workflow");
    @Override protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith(request.getContextPath() + "/api/");
    }
    static String route(String uri) {
        // Ne jamais enregistrer de query string ou de segments libres envoyés par le client.
        if (uri.matches("/api/auth/(login|logout|me)")) return uri;
        if (uri.equals("/api/csrf")) return uri;
        if (uri.equals("/api/products")) return uri;
        if (uri.matches("/api/products/[^/]+")) return "/api/products/{id}";
        if (uri.equals("/api/profile/photos")) return uri;
        if (uri.matches("/api/profile/photos/[^/]+/(content|current)"))
            return uri.endsWith("/content") ? "/api/profile/photos/{id}/content" : "/api/profile/photos/{id}/current";
        return "/api/other";
    }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String previous = MDC.get("workflowRequestId");
        String id = UUID.randomUUID().toString();
        MDC.put("workflowRequestId", id);
        response.setHeader("X-Request-ID", id);
        long start = System.nanoTime();
        boolean failed = false;
        String method = WorkflowLog.safe(request.getMethod());
        String path = route(request.getRequestURI().substring(request.getContextPath().length()));
        LOG.info("event=HTTP_START requestId={} method={} route={}", id, method, path);
        try {
            chain.doFilter(request, response);
        } catch (IOException | ServletException | RuntimeException exception) {
            failed = true;
            // Le message d'exception pourrait contenir des données sensibles : journaliser seulement son type.
            LOG.warn("event=HTTP_EXCEPTION requestId={} type={}", id, exception.getClass().getSimpleName());
            throw exception;
        } finally {
            LOG.info("event=HTTP_END requestId={} method={} route={} status={} durationMs={}",
                id, method, path, failed ? 500 : response.getStatus(), (System.nanoTime() - start) / 1_000_000);
            if (previous == null) MDC.remove("workflowRequestId"); else MDC.put("workflowRequestId", previous);
        }
    }
}
