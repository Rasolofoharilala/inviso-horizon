package com.inviso.horizon.security;

import java.awt.image.BufferedImage;
import java.io.*;
import java.nio.file.*;
import java.time.Instant;
import java.util.*;
import javax.imageio.ImageIO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ProfilePhotos {
    private final JdbcTemplate jdbc;
    private final Path root;
    public ProfilePhotos(JdbcTemplate jdbc, @Value("${horizon.images-directory:./images}") String directory) {
        this.jdbc = jdbc;
        this.root = Path.of(directory).toAbsolutePath().normalize();
    }
    public record Photo(UUID id, Instant createdAt, String url) { }
    private long userId(String username) {
        return jdbc.queryForObject("SELECT id FROM horizon_user WHERE username = ?", Long.class, username);
    }
    private String url(UUID id) { return "/api/profile/photos/" + id + "/content"; }
    public List<Photo> history(String username) {
        return jdbc.query("SELECT id, created_at FROM user_photo WHERE user_id = ? ORDER BY created_at DESC, id DESC",
            (rs, row) -> { UUID id = rs.getObject("id", UUID.class);
                return new Photo(id, rs.getTimestamp("created_at").toInstant(), url(id)); }, userId(username));
    }
    public Path content(String username, UUID id) {
        var keys = jdbc.queryForList("SELECT storage_key FROM user_photo WHERE id = ? AND user_id = ?",
            String.class, id, userId(username));
        if (keys.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        Path file = root.resolve(keys.getFirst()).normalize();
        if (!file.startsWith(root) || !Files.isRegularFile(file)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return file;
    }
    @Transactional
    public void restore(String username, UUID id) {
        WorkflowLog.event("PHOTO_RESTORE_START", username, "started");
        long uid = userId(username);
        if (jdbc.queryForObject("SELECT count(*) FROM user_photo WHERE id = ? AND user_id = ?", Long.class, id, uid) == 0)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        content(username, id);
        jdbc.update("UPDATE horizon_user SET avatar_id = ? WHERE id = ?", id, uid);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { WorkflowLog.event("PHOTO_RESTORE_COMMITTED", username, id.toString()); }
        });
    }
    @Transactional
    public Photo upload(String username, MultipartFile file) throws IOException {
        WorkflowLog.event("PHOTO_UPLOAD_START", username, "started");
        if (file.isEmpty() || file.getSize() > 2 * 1024 * 1024)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Image requise, maximum 2 Mo.");
        // Inspecter le format et les dimensions avant de décoder les pixels.
        BufferedImage decoded;
        try (var input = ImageIO.createImageInputStream(new ByteArrayInputStream(file.getBytes()))) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw invalid();
            var reader = readers.next();
            try {
                String format = reader.getFormatName();
                if (!format.equalsIgnoreCase("JPEG") && !format.equalsIgnoreCase("PNG")) throw invalid();
                reader.setInput(input);
                int w = reader.getWidth(0), h = reader.getHeight(0);
                if (w < 1 || h < 1 || w > 4096 || h > 4096 || (long) w * h > 4_000_000) throw invalid();
                decoded = reader.read(0);
            } finally { reader.dispose(); }
        } catch (IOException | IllegalArgumentException exception) { throw invalid(); }
        long uid = userId(username);
        UUID id = UUID.randomUUID();
        Instant now = Instant.now();
        String key = uid + "/" + now.toEpochMilli() + "_" + id + ".png";
        Path destination = root.resolve(key);
        Files.createDirectories(destination.getParent());
        // En cas d'échec SQL, supprimer uniquement le nouveau fichier.
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { WorkflowLog.event("PHOTO_UPLOAD_COMMITTED", username, id.toString()); }
            @Override public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    WorkflowLog.event("PHOTO_UPLOAD_ROLLBACK", username, id.toString());
                    try { Files.deleteIfExists(destination); } catch (IOException ignored) {
                        WorkflowLog.event("PHOTO_CLEANUP_FAILED", username, id.toString());
                    }
                }
            }
        });
        try (var output = Files.newOutputStream(destination, StandardOpenOption.CREATE_NEW)) {
            if (!ImageIO.write(decoded, "png", output)) throw new IOException("Encodage PNG indisponible");
        }
        jdbc.update("INSERT INTO user_photo(id, user_id, storage_key, created_at) VALUES (?, ?, ?, ?)",
            id, uid, key, java.sql.Timestamp.from(now));
        jdbc.update("UPDATE horizon_user SET avatar_id = ? WHERE id = ?", id, uid);
        return new Photo(id, now, url(id));
    }
    private static ResponseStatusException invalid() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Photo JPEG ou PNG valide requise (4 millions de pixels maximum).");
    }
}
