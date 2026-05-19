CREATE TABLE services (
  id               UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id        UUID           NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  name             VARCHAR(100)   NOT NULL,
  description      TEXT,
  price            DECIMAL(10, 2) NOT NULL,
  duration_minutes INT            NOT NULL,
  is_active        BOOLEAN        NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_services_artist_id  ON services(artist_id);
CREATE INDEX idx_services_is_active  ON services(is_active);
