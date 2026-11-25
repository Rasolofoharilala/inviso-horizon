package com.inviso.horizon.security;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration(proxyBeanMethods = false)
public class SecurityConfiguration {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

    @Bean SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http.addFilterBefore(new WorkflowRequestLogFilter(),
                org.springframework.security.web.context.SecurityContextHolderFilter.class)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/csrf", "/api/auth/login").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/products", "/api/products/**")
                    .hasAnyRole("ADMIN", "EDITOR", "VIEWER")
                .requestMatchers(HttpMethod.POST, "/api/products").hasAnyRole("ADMIN", "EDITOR")
                .requestMatchers(HttpMethod.PUT, "/api/products/**").hasAnyRole("ADMIN", "EDITOR")
                .requestMatchers(HttpMethod.DELETE, "/api/products/**").hasRole("ADMIN")
                .anyRequest().hasAnyRole("ADMIN", "EDITOR", "VIEWER"))
            .exceptionHandling(errors -> errors
                .authenticationEntryPoint((request, response, exception) -> {
                    WorkflowLog.event("AUTH_REQUIRED", null, "missing_or_expired_authentication");
                    json(response, 401, "Authentification requise.");
                })
                .accessDeniedHandler((request, response, exception) -> {
                    var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
                    WorkflowLog.event("ACCESS_DENIED", auth == null ? null : auth.getName(),
                        exception instanceof org.springframework.security.web.csrf.CsrfException ? "csrf_rejected" : "insufficient_privileges");
                    json(response, 403, "Manque d’autorisation ou jeton de sécurité expiré.");
                }))
            .formLogin(form -> form.loginProcessingUrl("/api/auth/login")
                .successHandler((request, response, authentication) -> {
                    WorkflowLog.event("LOGIN_SUCCESS", authentication.getName(), "authenticated");
                    response.setStatus(204);
                })
                .failureHandler((request, response, exception) -> {
                    // Ne pas lire request.getParameter : aucun corps ni mot de passe dans les logs.
                    WorkflowLog.event("LOGIN_FAILURE", null, exception.getClass().getSimpleName());
                    json(response, 401, "Identifiant ou mot de passe incorrect.");
                }))
            .logout(logout -> logout.logoutUrl("/api/auth/logout")
                .invalidateHttpSession(true).clearAuthentication(true).deleteCookies("JSESSIONID")
                .logoutSuccessHandler((request, response, authentication) -> {
                    WorkflowLog.event("LOGOUT_SUCCESS", authentication == null ? null : authentication.getName(), "session_invalidated");
                    response.setStatus(204);
                }))
            .build();
    }

    private static void json(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/problem+json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("{\"status\":" + status + ",\"detail\":\"" + message + "\"}");
    }
}
