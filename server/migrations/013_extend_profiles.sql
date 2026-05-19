-- Users: 性别、生日、地区
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender   VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(100);

-- Artists: 兼职/全职
ALTER TABLE artists ADD COLUMN IF NOT EXISTS is_part_time BOOLEAN NOT NULL DEFAULT FALSE;

-- 关注关系
CREATE TABLE IF NOT EXISTS follows (
  follower_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
