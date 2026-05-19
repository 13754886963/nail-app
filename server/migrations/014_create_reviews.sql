CREATE TABLE IF NOT EXISTS reviews (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID        NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
  customer_id    UUID        NOT NULL REFERENCES users(id),
  artist_id      UUID        NOT NULL REFERENCES artists(id),
  rating         SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_artist_id ON reviews(artist_id);
