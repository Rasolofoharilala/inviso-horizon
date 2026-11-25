package com.inviso.horizon.security;

import java.util.Map;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(name = "horizon.dev-users.enabled", havingValue = "true")
public class DevUserSeeder implements ApplicationRunner {
    private final AppUserRepository repository;
    private final PasswordEncoder encoder;
    private final Environment environment;
    public DevUserSeeder(AppUserRepository repository, PasswordEncoder encoder, Environment environment) {
        this.repository = repository; this.encoder = encoder; this.environment = environment;
    }
    @Override @Transactional
    public void run(ApplicationArguments arguments) {
        var accounts = Map.of("admin", UserRole.ADMIN, "editeur", UserRole.EDITOR,
                "lecteur", UserRole.VIEWER, "restreint", UserRole.RESTRICTED);
        accounts.forEach((username, role) -> {
            if (repository.findByUsername(username).isPresent()) return;
            var password = environment.getProperty("horizon.dev-users." + username + "-password");
            if (password == null || password.length() < 12 || password.length() > 72
                    || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72) {
                throw new IllegalStateException("Configurer un mot de passe de test de 12 à 72 octets pour " + username);
            }
            repository.save(new AppUser(username, encoder.encode(password), role));
        });
    }
}
