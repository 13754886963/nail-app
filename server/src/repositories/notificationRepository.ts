import { pool } from '../config/database';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  appointment_id: string | null;
  is_read: boolean;
  created_at: Date;
}

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  appointmentId?: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, appointment_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [params.userId, params.type, params.title, params.body ?? null, params.appointmentId ?? null]
  );
}

export async function getUserNotifications(userId: string): Promise<Notification[]> {
  const result = await pool.query<Notification>(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [userId]
  );
  return result.rows;
}

export async function getUnreadCount(userId: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
  return Number(result.rows[0]!.count);
}

export async function markAllRead(userId: string): Promise<void> {
  await pool.query(
    `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
}
