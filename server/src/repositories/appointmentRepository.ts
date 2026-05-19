import { pool } from '../config/database';

export type AppointmentStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';

export interface Appointment {
  id: string;
  customer_id: string;
  customer_name: string;
  artist_id: string;
  artist_user_id: string;
  artist_name: string;
  style_id: string | null;
  style_title: string | null;
  style_image_url: string | null;
  scheduled_at: Date;
  note: string | null;
  status: AppointmentStatus;
  reject_reason: string | null;
  created_at: Date;
}

const SELECT_APPOINTMENT = `
  SELECT
    a.id, a.customer_id, a.artist_id, a.style_id,
    a.scheduled_at, a.note, a.status, a.reject_reason, a.created_at,
    cu.name  AS customer_name,
    ar.user_id AS artist_user_id,
    au.name  AS artist_name,
    ns.title AS style_title,
    (SELECT image_url FROM style_images si WHERE si.style_id = ns.id ORDER BY si.sort_order LIMIT 1) AS style_image_url
  FROM appointments a
  JOIN users    cu ON cu.id = a.customer_id
  JOIN artists  ar ON ar.id = a.artist_id
  JOIN users    au ON au.id = ar.user_id
  LEFT JOIN nail_styles ns ON ns.id = a.style_id
`;

export async function createAppointment(params: {
  customerId: string;
  artistId: string;
  styleId: string | null;
  scheduledAt: Date;
  note: string | null;
}): Promise<Appointment> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO appointments (customer_id, artist_id, style_id, scheduled_at, note)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [params.customerId, params.artistId, params.styleId, params.scheduledAt, params.note]
  );
  const row = await pool.query<Appointment>(
    `${SELECT_APPOINTMENT} WHERE a.id = $1`,
    [result.rows[0]!.id]
  );
  return row.rows[0]!;
}

export async function getCustomerAppointments(customerId: string): Promise<Appointment[]> {
  const result = await pool.query<Appointment>(
    `${SELECT_APPOINTMENT} WHERE a.customer_id = $1 ORDER BY a.scheduled_at DESC`,
    [customerId]
  );
  return result.rows;
}

export async function getArtistAppointments(artistId: string): Promise<Appointment[]> {
  const result = await pool.query<Appointment>(
    `${SELECT_APPOINTMENT} WHERE a.artist_id = $1 ORDER BY a.scheduled_at DESC`,
    [artistId]
  );
  return result.rows;
}

export async function getAppointmentById(id: string): Promise<Appointment | null> {
  const result = await pool.query<Appointment>(
    `${SELECT_APPOINTMENT} WHERE a.id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
  rejectReason?: string
): Promise<Appointment | null> {
  await pool.query(
    `UPDATE appointments SET status = $1, reject_reason = $2, updated_at = NOW() WHERE id = $3`,
    [status, rejectReason ?? null, id]
  );
  return getAppointmentById(id);
}
