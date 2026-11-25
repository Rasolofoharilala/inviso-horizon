package com.inviso.horizon.security;

import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

/** Journal technique : jamais de corps HTTP, cookies, mots de passe ou jetons. */
final class WorkflowLog {
    private WorkflowLog() { }
    static String safe(String value) {
        if (value == null || value.isEmpty()) return "anonymous";
        return value.substring(0, Math.min(80, value.length())).replaceAll("[^\\p{L}\\p{N}_.@-]", "_");
    }
    static void event(String event, String actor, String reason) {
        LoggerFactory.getLogger("horizon.workflow").info(
            "event={} requestId={} actor={} reason={}", event, MDC.get("workflowRequestId"), safe(actor), safe(reason));
    }
}
