CREATE TABLE categories (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(50) NOT NULL UNIQUE,
  sort_order INT         NOT NULL DEFAULT 0
);

CREATE INDEX idx_categories_sort_order ON categories(sort_order);
