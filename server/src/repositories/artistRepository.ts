import { pool } from '../config/database';

export async function createArtist(userId: string): Promise<void> {
  await pool.query('INSERT INTO artists (user_id) VALUES ($1)', [userId]);
}

export async function findArtistByUserId(userId: string): Promise<{ id: string } | null> {
  const result = await pool.query<{ id: string }>(
    'SELECT id FROM artists WHERE user_id = $1',
    [userId]
  );
  return result.rows[0] ?? null;
}

export interface ArtistProfile {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  background_url: string | null;
  location: string | null;
  bio: string | null;
  years_of_experience: number | null;
  is_part_time: boolean;
  works_count: number;
  likes_count: number;
  favorites_count: number;
  served_count: number;
  follower_count: number;
  is_followed: boolean;
  avg_rating: number;
  review_count: number;
}

export interface ArtistStyle {
  id: string;
  artist_id: string;
  category_name: string;
  title: string;
  image_url: string | null;
  created_at: Date;
}

export async function getArtistProfile(artistId: string, currentUserId?: string): Promise<ArtistProfile | null> {
  const result = await pool.query<ArtistProfile>(
    `SELECT
       a.id, a.user_id,
       u.name, u.avatar_url, u.background_url,
       u.location,
       a.bio, a.years_of_experience, a.is_part_time,
       (SELECT COUNT(*) FROM nail_styles          WHERE artist_id = a.id)::int                                         AS works_count,
       (SELECT COUNT(*) FROM likes     l JOIN nail_styles ns ON ns.id = l.style_id WHERE ns.artist_id = a.id)::int     AS likes_count,
       (SELECT COUNT(*) FROM favorites f JOIN nail_styles ns ON ns.id = f.style_id WHERE ns.artist_id = a.id)::int     AS favorites_count,
       (SELECT COUNT(*) FROM appointments         WHERE artist_id = a.id AND status = 'completed')::int                AS served_count,
       (SELECT COUNT(*) FROM follows              WHERE following_id = a.user_id)::int                                 AS follower_count,
       COALESCE((SELECT ROUND(AVG(rating)::numeric,1) FROM reviews WHERE artist_id = a.id), 0)                        AS avg_rating,
       (SELECT COUNT(*) FROM reviews             WHERE artist_id = a.id)::int                                         AS review_count,
       COALESCE(
         (SELECT TRUE FROM follows WHERE follower_id = $2 AND following_id = a.user_id LIMIT 1),
         FALSE
       ) AS is_followed
     FROM artists a
     JOIN users u ON u.id = a.user_id
     WHERE a.id = $1`,
    [artistId, currentUserId ?? null]
  );
  return result.rows[0] ?? null;
}

export async function updateArtist(
  userId: string,
  data: { bio?: string | null; years_of_experience?: number | null; is_part_time?: boolean }
): Promise<void> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (data.bio               !== undefined) { sets.push(`bio = $${idx++}`);                 params.push(data.bio               || null); }
  if (data.years_of_experience !== undefined) { sets.push(`years_of_experience = $${idx++}`); params.push(data.years_of_experience ?? null); }
  if (data.is_part_time      !== undefined) { sets.push(`is_part_time = $${idx++}`);        params.push(data.is_part_time); }

  if (sets.length === 0) return;
  params.push(userId);
  await pool.query(
    `UPDATE artists SET ${sets.join(', ')} WHERE user_id = $${idx}`,
    params
  );
}

export async function listArtists(currentUserId?: string, search?: string): Promise<ArtistProfile[]> {
  const params: unknown[] = [currentUserId ?? null];
  let whereClause = `WHERE u.role = 'artist'`;
  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND (u.name ILIKE $2 OR u.location ILIKE $2)`;
  }
  const result = await pool.query<ArtistProfile>(
    `SELECT
       a.id, a.user_id,
       u.name, u.avatar_url, u.background_url,
       u.location,
       a.bio, a.years_of_experience, a.is_part_time,
       (SELECT COUNT(*) FROM nail_styles                                                       WHERE artist_id = a.id)::int               AS works_count,
       (SELECT COUNT(*) FROM likes     l JOIN nail_styles ns ON ns.id = l.style_id             WHERE ns.artist_id = a.id)::int            AS likes_count,
       (SELECT COUNT(*) FROM favorites f JOIN nail_styles ns ON ns.id = f.style_id             WHERE ns.artist_id = a.id)::int            AS favorites_count,
       (SELECT COUNT(*) FROM appointments                                                       WHERE artist_id = a.id AND status = 'completed')::int AS served_count,
       (SELECT COUNT(*) FROM follows                                                            WHERE following_id = a.user_id)::int       AS follower_count,
       COALESCE((SELECT ROUND(AVG(rating)::numeric,1) FROM reviews WHERE artist_id = a.id), 0) AS avg_rating,
       (SELECT COUNT(*) FROM reviews                                                            WHERE artist_id = a.id)::int              AS review_count,
       COALESCE((SELECT TRUE FROM follows WHERE follower_id = $1 AND following_id = a.user_id LIMIT 1), FALSE) AS is_followed
     FROM artists a
     JOIN users u ON u.id = a.user_id
     ${whereClause}
     ORDER BY follower_count DESC, works_count DESC
     LIMIT 50`,
    params
  );
  return result.rows;
}

export async function getArtistStyles(artistId: string): Promise<ArtistStyle[]> {
  const result = await pool.query<ArtistStyle>(
    `SELECT
       ns.id, ns.artist_id,
       c.name AS category_name,
       ns.title,
       (SELECT image_url FROM style_images si WHERE si.style_id = ns.id ORDER BY si.sort_order LIMIT 1) AS image_url,
       ns.created_at
     FROM nail_styles ns
     JOIN categories c ON c.id = ns.category_id
     WHERE ns.artist_id = $1
     ORDER BY ns.created_at DESC, ns.id`,
    [artistId]
  );
  return result.rows;
}
