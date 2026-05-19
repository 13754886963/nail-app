CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');

CREATE TABLE appointments (
  id           UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id  UUID               NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  artist_id    UUID               NOT NULL REFERENCES artists(id),
  service_id   UUID               NOT NULL REFERENCES services(id),
  style_id     UUID               REFERENCES nail_styles(id) ON DELETE SET NULL,
  salon_id     UUID               REFERENCES salons(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ        NOT NULL,
  status       appointment_status NOT NULL DEFAULT 'pending',
  note         TEXT,
  created_at   TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointments_customer_id  ON appointments(customer_id);
CREATE INDEX idx_appointments_artist_id    ON appointments(artist_id);
CREATE INDEX idx_appointments_status       ON appointments(status);
CREATE INDEX idx_appointments_scheduled_at ON appointments(scheduled_at);
