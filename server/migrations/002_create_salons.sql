CREATE TABLE salons (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             VARCHAR(100) NOT NULL,
  address          TEXT         NOT NULL,
  city             VARCHAR(50)  NOT NULL,
  phone            VARCHAR(20),
  cover_image_url  VARCHAR,
  business_hours   JSONB,
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_salons_city      ON salons(city);
CREATE INDEX idx_salons_is_active ON salons(is_active);
