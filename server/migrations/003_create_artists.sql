CREATE TABLE artists (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  salon_id            UUID        REFERENCES salons(id) ON DELETE SET NULL,
  bio                 TEXT,
  years_of_experience INT,
  avatar_url          VARCHAR,
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_artists_user_id ON artists(user_id);
CREATE INDEX idx_artists_salon_id   ON artists(salon_id);
CREATE INDEX idx_artists_is_active  ON artists(is_active);
