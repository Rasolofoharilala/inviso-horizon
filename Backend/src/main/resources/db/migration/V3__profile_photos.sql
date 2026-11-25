CREATE TABLE user_photo (
    id UUID PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES horizon_user(id),
    storage_key VARCHAR(240) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id, user_id)
);
ALTER TABLE horizon_user ADD COLUMN avatar_id UUID;
ALTER TABLE horizon_user ADD CONSTRAINT avatar_owner_fk
    FOREIGN KEY (avatar_id, id) REFERENCES user_photo(id, user_id);
CREATE INDEX user_photo_history_idx ON user_photo(user_id, created_at DESC);
