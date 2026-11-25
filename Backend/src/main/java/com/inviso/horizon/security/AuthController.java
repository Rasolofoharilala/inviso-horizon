package com.inviso.horizon.security;

import java.util.List;
import java.util.UUID;
import java.io.IOException;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class AuthController {
    private final AppUserRepository users;
    private final ProfilePhotos photos;
    public AuthController(AppUserRepository users, ProfilePhotos photos) { this.users = users; this.photos = photos; }
    public record CurrentUser(String username, List<String> roles, String avatarUrl) { }
    @GetMapping("/api/auth/me")
    public CurrentUser me(Authentication authentication) {
        var user = users.findByUsername(authentication.getName()).orElseThrow();
        return new CurrentUser(user.getUsername(), List.of(user.getRole().name()),
            user.getAvatarId() == null ? null : "/api/profile/photos/" + user.getAvatarId() + "/content");
    }
    @GetMapping("/api/profile/photos")
    public List<ProfilePhotos.Photo> history(Authentication auth) { return photos.history(auth.getName()); }
    @PostMapping(value = "/api/profile/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ProfilePhotos.Photo upload(Authentication auth, @RequestParam("file") MultipartFile file) throws IOException {
        return photos.upload(auth.getName(), file);
    }
    @PutMapping("/api/profile/photos/{id}/current")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void restore(Authentication auth, @PathVariable UUID id) { photos.restore(auth.getName(), id); }
    @GetMapping("/api/profile/photos/{id}/content")
    public ResponseEntity<FileSystemResource> content(Authentication auth, @PathVariable UUID id) {
        return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG)
            .cacheControl(CacheControl.noStore()).header("X-Content-Type-Options", "nosniff")
            .body(new FileSystemResource(photos.content(auth.getName(), id)));
    }
}
