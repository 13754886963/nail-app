import { pool } from '../config/database';

export interface DaySchedule {
  day_of_week: number;
  is_available: boolean;
  start_time: string;
  end_time: string;
}

export async function getArtistAvailability(artistId: string): Promise<DaySchedule[]> {
  const result = await pool.query<DaySchedule>(
    `SELECT day_of_week, is_available,
            to_char(start_time, 'HH24:MI') AS start_time,
            to_char(end_time,   'HH24:MI') AS end_time
     FROM artist_availability
     WHERE artist_id = $1
     ORDER BY day_of_week`,
    [artistId]
  );
  return result.rows;
}

export async function upsertArtistAvailability(artistId: string, schedule: DaySchedule[]): Promise<void> {
  if (schedule.length === 0) return;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const s of schedule) {
      await client.query(
        `INSERT INTO artist_availability (artist_id, day_of_week, is_available, start_time, end_time)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (artist_id, day_of_week) DO UPDATE
           SET is_available = EXCLUDED.is_available,
               start_time   = EXCLUDED.start_time,
               end_time     = EXCLUDED.end_time`,
        [artistId, s.day_of_week, s.is_available, s.start_time, s.end_time]
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
