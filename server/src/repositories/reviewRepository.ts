import { pool } from '../config/database';

export interface Review {
  id: string;
  appointment_id: string;
  customer_id: string;
  customer_name: string;
  customer_avatar_url: string | null;
  rating: number;
  comment: string | null;
  artist_reply: string | null;
  artist_replied_at: Date | null;
  created_at: Date;
}

const REVIEW_SELECT = `
  SELECT r.id, r.appointment_id, r.customer_id,
         u.name AS customer_name, u.avatar_url AS customer_avatar_url,
         r.rating, r.comment,
         r.artist_reply, r.artist_replied_at,
         r.created_at
  FROM reviews r
  JOIN users u ON u.id = r.customer_id`;

export async function createReview(data: {
  appointmentId: string;
  customerId: string;
  artistId: string;
  rating: number;
  comment?: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO reviews (appointment_id, customer_id, artist_id, rating, comment)
     VALUES ($1, $2, $3, $4, $5)`,
    [data.appointmentId, data.customerId, data.artistId, data.rating, data.comment ?? null]
  );
}

export async function getReviewByAppointmentId(appointmentId: string): Promise<Review | null> {
  const result = await pool.query<Review>(
    `${REVIEW_SELECT} WHERE r.appointment_id = $1`,
    [appointmentId]
  );
  return result.rows[0] ?? null;
}

export async function getReviewById(reviewId: string): Promise<Review | null> {
  const result = await pool.query<Review>(
    `${REVIEW_SELECT} WHERE r.id = $1`,
    [reviewId]
  );
  return result.rows[0] ?? null;
}

export async function setArtistReply(reviewId: string, reply: string): Promise<Review | null> {
  await pool.query(
    `UPDATE reviews SET artist_reply = $1, artist_replied_at = NOW() WHERE id = $2`,
    [reply, reviewId]
  );
  return getReviewById(reviewId);
}

export async function getArtistReviews(artistId: string): Promise<Review[]> {
  const result = await pool.query<Review>(
    `${REVIEW_SELECT} WHERE r.artist_id = $1 ORDER BY r.created_at DESC`,
    [artistId]
  );
  return result.rows;
}

export async function getArtistRatingSummary(
  artistId: string
): Promise<{ avg: number; count: number }> {
  const result = await pool.query<{ avg: string | null; count: string }>(
    `SELECT ROUND(AVG(rating)::numeric, 1) AS avg, COUNT(*)::int AS count
     FROM reviews WHERE artist_id = $1`,
    [artistId]
  );
  const row = result.rows[0]!;
  return { avg: row.avg ? Number(row.avg) : 0, count: Number(row.count) };
}
