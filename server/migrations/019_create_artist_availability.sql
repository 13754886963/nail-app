CREATE TABLE IF NOT EXISTS artist_availability (
  id           UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id    UUID       NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  day_of_week  SMALLINT   NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_available BOOLEAN    NOT NULL DEFAULT false,
  start_time   TIME       NOT NULL DEFAULT '09:00',
  end_time     TIME       NOT NULL DEFAULT '18:00',
  UNIQUE (artist_id, day_of_week)
);
