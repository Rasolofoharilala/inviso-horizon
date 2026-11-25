package com.inviso.horizon.security;

import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DatabaseUserDetailsServiceTests {
    private final AppUserRepository users = mock(AppUserRepository.class);
    private final DatabaseUserDetailsService service = new DatabaseUserDetailsService(users);
    @Test void absentAccountIsRejected() {
        when(users.findByUsername("absent")).thenReturn(Optional.empty());
        assertThrows(UsernameNotFoundException.class, () -> service.loadUserByUsername("absent"));
    }
    @Test void restrictedAccountIsRejectedBeforeAuthenticationSucceeds() {
        when(users.findByUsername("restreint")).thenReturn(Optional.of(new AppUser("restreint", "hash", UserRole.RESTRICTED)));
        assertThrows(DisabledException.class, () -> service.loadUserByUsername("restreint"));
    }
    @Test void authorizedAccountGetsItsActualRole() {
        when(users.findByUsername("lecteur")).thenReturn(Optional.of(new AppUser("lecteur", "hash", UserRole.VIEWER)));
        var details = service.loadUserByUsername("lecteur");
        assertEquals("lecteur", details.getUsername());
        assertEquals("ROLE_VIEWER", details.getAuthorities().iterator().next().getAuthority());
        assertTrue(details.isEnabled());
    }
}
