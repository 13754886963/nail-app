import { pool } from '../config/database';

export interface FavoriteStyle {
  id: string;
  title: string;
  artist_name: string;
  category_name: string;
  image_url: string | null;
}

export interface StyleDetail {
  id: string;
  artist_id: string;
  artist_user_id: string;
  artist_name: string;
  category_name: string;
  title: string;
  description: string | null;
  tags: string[];
  image_url: string | null;
  created_at: Date;
  like_count: number;
  favorite_count: number;
  comment_count: number;
  is_liked: boolean;
  is_favorited: boolean;
  is_public: boolean;
}

export interface Comment {
  id: string;
  user_id: string;
  user_name: string;
  content: string;
  created_at: Date;
  parent_id: string | null;
  reply_to_user_name: string | null;
}

export async function getStyleDetail(styleId: string, userId: string): Promise<StyleDetail | null> {
  const result = await pool.query<StyleDetail>(
    `SELECT
       ns.id, ns.artist_id,
       a.user_id AS artist_user_id,
       u.name  AS artist_name,
       c.name  AS category_name,
       ns.title, ns.description, ns.tags,
       (SELECT image_url FROM style_images si WHERE si.style_id = ns.id ORDER BY si.sort_order LIMIT 1) AS image_url,
       ns.created_at, ns.is_public,
       (SELECT COUNT(*) FROM likes     WHERE style_id = ns.id)::int AS like_count,
       (SELECT COUNT(*) FROM favorites WHERE style_id = ns.id)::int AS favorite_count,
       (SELECT COUNT(*) FROM comments  WHERE style_id = ns.id)::int AS comment_count,
       EXISTS(SELECT 1 FROM likes     WHERE style_id = ns.id AND user_id = $2) AS is_liked,
       EXISTS(SELECT 1 FROM favorites WHERE style_id = ns.id AND user_id = $2) AS is_favorited
     FROM nail_styles ns
     JOIN categories c ON c.id = ns.category_id
     JOIN artists    a ON a.id = ns.artist_id
     JOIN users      u ON u.id = a.user_id
     WHERE ns.id = $1`,
    [styleId, userId]
  );
  return result.rows[0] ?? null;
}

export async function toggleLike(styleId: string, userId: string): Promise<boolean> {
  const existing = await pool.query(
    'SELECT id FROM likes WHERE style_id = $1 AND user_id = $2',
    [styleId, userId]
  );
  if (existing.rows.length > 0) {
    await pool.query('DELETE FROM likes WHERE style_id = $1 AND user_id = $2', [styleId, userId]);
    return false;
  }
  await pool.query('INSERT INTO likes (style_id, user_id) VALUES ($1, $2)', [styleId, userId]);
  return true;
}

export async function toggleFavorite(styleId: string, userId: string): Promise<boolean> {
  const existing = await pool.query(
    'SELECT id FROM favorites WHERE style_id = $1 AND user_id = $2',
    [styleId, userId]
  );
  if (existing.rows.length > 0) {
    await pool.query('DELETE FROM favorites WHERE style_id = $1 AND user_id = $2', [styleId, userId]);
    return false;
  }
  await pool.query('INSERT INTO favorites (style_id, user_id) VALUES ($1, $2)', [styleId, userId]);
  return true;
}

export async function getComments(styleId: string): Promise<Comment[]> {
  const result = await pool.query<Comment>(
    `SELECT c.id, c.user_id, u.name AS user_name, c.content, c.created_at, c.parent_id, c.reply_to_user_name
     FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.style_id = $1
     ORDER BY c.created_at ASC`,
    [styleId]
  );
  return result.rows;
}

export async function getFavoriteStyles(userId: string): Promise<FavoriteStyle[]> {
  const result = await pool.query<FavoriteStyle>(
    `SELECT
       ns.id, ns.title,
       u.name  AS artist_name,
       c.name  AS category_name,
       (SELECT image_url FROM style_images si WHERE si.style_id = ns.id ORDER BY si.sort_order LIMIT 1) AS image_url
     FROM favorites f
     JOIN nail_styles ns ON ns.id = f.style_id
     JOIN categories  c  ON c.id  = ns.category_id
     JOIN artists     a  ON a.id  = ns.artist_id
     JOIN users       u  ON u.id  = a.user_id
     WHERE f.user_id = $1
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return result.rows;
}

export interface MyComment {
  id: string;
  content: string;
  created_at: Date;
  style_id: string;
  style_title: string;
  style_image_url: string | null;
  artist_name: string;
}

export interface ReceivedComment {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar_url: string | null;
  content: string;
  created_at: Date;
  style_id: string;
  style_title: string;
  style_image_url: string | null;
}

export async function getMyComments(userId: string): Promise<MyComment[]> {
  const result = await pool.query<MyComment>(
    `SELECT
       c.id, c.content, c.created_at,
       ns.id        AS style_id,
       ns.title     AS style_title,
       u2.name      AS artist_name,
       (SELECT image_url FROM style_images si WHERE si.style_id = ns.id ORDER BY si.sort_order LIMIT 1) AS style_image_url
     FROM comments c
     JOIN nail_styles ns ON ns.id = c.style_id
     JOIN artists     a  ON a.id  = ns.artist_id
     JOIN users       u2 ON u2.id = a.user_id
     WHERE c.user_id = $1
     ORDER BY c.created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function getReceivedComments(artistUserId: string): Promise<ReceivedComment[]> {
  const result = await pool.query<ReceivedComment>(
    `SELECT
       c.id, c.user_id, c.content, c.created_at,
       u.name           AS user_name,
       u.avatar_url     AS user_avatar_url,
       ns.id            AS style_id,
       ns.title         AS style_title,
       (SELECT image_url FROM style_images si WHERE si.style_id = ns.id ORDER BY si.sort_order LIMIT 1) AS style_image_url
     FROM comments c
     JOIN users       u  ON u.id  = c.user_id
     JOIN nail_styles ns ON ns.id = c.style_id
     JOIN artists     a  ON a.id  = ns.artist_id
     WHERE a.user_id = $1
     ORDER BY c.created_at DESC`,
    [artistUserId]
  );
  return result.rows;
}

export async function addComment(
  styleId: string,
  userId: string,
  content: string,
  parentId?: string,
  replyToUserName?: string,
): Promise<Comment> {
  const result = await pool.query<{ id: string; content: string; created_at: Date; parent_id: string | null; reply_to_user_name: string | null }>(
    `INSERT INTO comments (style_id, user_id, content, parent_id, reply_to_user_name)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, content, created_at, parent_id, reply_to_user_name`,
    [styleId, userId, content.trim(), parentId ?? null, replyToUserName ?? null]
  );
  const row = result.rows[0]!;
  const userResult = await pool.query<{ name: string }>('SELECT name FROM users WHERE id = $1', [userId]);
  return {
    id: row.id,
    user_id: userId,
    user_name: userResult.rows[0]?.name ?? '',
    content: row.content,
    created_at: row.created_at,
    parent_id: row.parent_id,
    reply_to_user_name: row.reply_to_user_name,
  };
}
