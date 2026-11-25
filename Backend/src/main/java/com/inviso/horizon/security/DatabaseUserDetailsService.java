package com.inviso.horizon.security;

import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DatabaseUserDetailsService implements UserDetailsService {
    private final AppUserRepository repository;
    public DatabaseUserDetailsService(AppUserRepository repository) { this.repository = repository; }
    @Override @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) {
        WorkflowLog.event("ACCOUNT_LOOKUP", username, "started");
        var user = repository.findByUsername(username)
                .orElseThrow(() -> {
                    WorkflowLog.event("ACCOUNT_REJECTED", username, "account_not_found");
                    return new UsernameNotFoundException("Identifiants incorrects");
                });
        WorkflowLog.event("ACCOUNT_FOUND", username, user.isEnabled() ? "enabled" : "disabled");
        if (user.getRole() == UserRole.RESTRICTED) {
            WorkflowLog.event("ENTRY_REJECTED", username, "restricted_role");
            throw new org.springframework.security.authentication.DisabledException("Accès Horizon non autorisé");
        }
        WorkflowLog.event("ENTRY_CHECK", username, user.getRole().name());
        return User.withUsername(user.getUsername()).password(user.getPasswordHash())
                .roles(user.getRole().name()).disabled(!user.isEnabled()).build();
    }
}
