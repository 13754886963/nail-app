CREATE TABLE IF NOT EXISTS appointment_images (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id  UUID        NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  image_url       TEXT        NOT NULL,
  sort_order      INT         DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointment_images_appointment_id ON appointment_images(appointment_id);
