package com.inviso.horizon.security;

import jakarta.persistence.*;

@Entity
@Table(name = "horizon_user")
public class AppUser {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 80)
    private String username;
    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20)
    private UserRole role;
    @Column(nullable = false)
    private boolean enabled;
    @Column(name = "avatar_id")
    private java.util.UUID avatarId;
    public Long getId() { return id; }
    public java.util.UUID getAvatarId() { return avatarId; }
    protected AppUser() { }
    public AppUser(String username, String passwordHash, UserRole role) {
        this.username = username;
        this.passwordHash = passwordHash;
        this.role = role;
        this.enabled = true;
    }
    public String getUsername() { return username; }
    public String getPasswordHash() { return passwordHash; }
    public UserRole getRole() { return role; }
    public boolean isEnabled() { return enabled; }
}
