import { pool } from '../config/database';

export async function toggleFollow(
  followerId: string,
  followingId: string
): Promise<boolean> {
  const existing = await pool.query(
    'SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = $2',
    [followerId, followingId]
  );
  if (existing.rows.length > 0) {
    await pool.query(
      'DELETE FROM follows WHERE follower_id = $1 AND following_id = $2',
      [followerId, followingId]
    );
    return false;
  } else {
    await pool.query(
      'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
      [followerId, followingId]
    );
    return true;
  }
}

export interface FollowingArtist {
  artist_id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  works_count: number;
  follower_count: number;
}

export async function getFollowingArtists(followerId: string): Promise<FollowingArtist[]> {
  const result = await pool.query<FollowingArtist>(
    `SELECT
       a.id                                                                AS artist_id,
       a.user_id,
       u.name, u.avatar_url,
       (SELECT COUNT(*) FROM nail_styles WHERE artist_id = a.id)::int     AS works_count,
       (SELECT COUNT(*) FROM follows WHERE following_id = a.user_id)::int AS follower_count
     FROM follows f
     JOIN users   u ON u.id = f.following_id
     JOIN artists a ON a.user_id = f.following_id
     WHERE f.follower_id = $1
     ORDER BY f.created_at DESC`,
    [followerId]
  );
  return result.rows;
}

export async function getFollowerCount(userId: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::int AS count FROM follows WHERE following_id = $1',
    [userId]
  );
  return Number(result.rows[0]!.count);
}

export interface Follower {
  id: string;
  name: string;
  avatar_url: string | null;
}

export async function getMyFollowers(artistUserId: string): Promise<Follower[]> {
  const result = await pool.query<Follower>(
    `SELECT u.id, u.name, u.avatar_url
     FROM follows f
     JOIN users u ON u.id = f.follower_id
     WHERE f.following_id = $1
     ORDER BY f.created_at DESC`,
    [artistUserId]
  );
  return result.rows;
}
