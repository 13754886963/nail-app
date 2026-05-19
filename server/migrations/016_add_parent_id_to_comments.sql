ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS parent_id          UUID REFERENCES comments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS reply_to_user_name TEXT;
