CREATE TABLE nail_styles (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id   UUID        NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  category_id UUID        NOT NULL REFERENCES categories(id),
  title       VARCHAR(100) NOT NULL,
  description TEXT,
  tags        TEXT[]      NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE style_images (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  style_id   UUID        NOT NULL REFERENCES nail_styles(id) ON DELETE CASCADE,
  image_url  VARCHAR     NOT NULL,
  sort_order INT         NOT NULL DEFAULT 0
);

CREATE INDEX idx_nail_styles_artist_id   ON nail_styles(artist_id);
CREATE INDEX idx_nail_styles_category_id ON nail_styles(category_id);
CREATE INDEX idx_nail_styles_tags        ON nail_styles USING GIN(tags);
CREATE INDEX idx_style_images_style_id   ON style_images(style_id);
