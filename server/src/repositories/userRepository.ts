import { pool } from '../config/database';

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  password_hash: string;
  avatar_url: string | null;
  background_url: string | null;
  role: 'customer' | 'artist';
  gender: string | null;
  birthday: Date | null;
  location: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] ?? null;
}

export async function findUserById(id: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] ?? null;
}

export async function getUserStats(
  userId: string,
  role: 'customer' | 'artist'
): Promise<Record<string, number>> {
  if (role === 'customer') {
    const result = await pool.query<{ favorites: string; appointments: string; following: string }>(
      `SELECT
         (SELECT COUNT(*) FROM favorites WHERE user_id = $1)::int      AS favorites,
         (SELECT COUNT(*) FROM appointments WHERE customer_id = $1)::int AS appointments,
         (SELECT COUNT(*) FROM follows WHERE follower_id = $1)::int      AS following`,
      [userId]
    );
    const row = result.rows[0]!;
    return { favorites: Number(row.favorites), appointments: Number(row.appointments), following: Number(row.following) };
  } else {
    const result = await pool.query<{ works: string; served: string }>(
      `SELECT
         (SELECT COUNT(*) FROM nail_styles ns
          JOIN artists a ON a.id = ns.artist_id WHERE a.user_id = $1)::int AS works,
         (SELECT COUNT(*) FROM appointments ap
          JOIN artists a ON a.id = ap.artist_id
          WHERE a.user_id = $1 AND ap.status = 'completed')::int           AS served`,
      [userId]
    );
    const row = result.rows[0]!;
    return { works: Number(row.works), served: Number(row.served) };
  }
}

export async function updateUser(
  id: string,
  data: {
    name?: string;
    phone?: string | null;
    email?: string;
    gender?: string | null;
    birthday?: string | null;
    location?: string | null;
  }
): Promise<UserRow | null> {
  const sets: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];
  let idx = 1;

  if (data.name     !== undefined) { sets.push(`name = $${idx++}`);           params.push(data.name); }
  if (data.phone    !== undefined) { sets.push(`phone = $${idx++}`);          params.push(data.phone    || null); }
  if (data.email    !== undefined) { sets.push(`email = $${idx++}`);          params.push(data.email); }
  if (data.gender   !== undefined) { sets.push(`gender = $${idx++}`);         params.push(data.gender   || null); }
  if (data.birthday !== undefined) { sets.push(`birthday = $${idx++}::date`); params.push(data.birthday || null); }
  if (data.location !== undefined) { sets.push(`location = $${idx++}`);       params.push(data.location || null); }

  params.push(id);
  const result = await pool.query<UserRow>(
    `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    params
  );
  return result.rows[0] ?? null;
}

export async function updateAvatarUrl(id: string, url: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>(
    'UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [url, id]
  );
  return result.rows[0] ?? null;
}

export async function updateBackgroundUrl(id: string, url: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>(
    'UPDATE users SET background_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [url, id]
  );
  return result.rows[0] ?? null;
}

export async function switchUserRole(id: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>(
    `UPDATE users
     SET role = CASE WHEN role = 'customer' THEN 'artist'::user_role ELSE 'customer'::user_role END,
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function updatePassword(id: string, passwordHash: string): Promise<void> {
  await pool.query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [passwordHash, id]
  );
}

export async function createUser(data: {
  name: string;
  email: string;
  passwordHash: string;
  role?: 'customer' | 'artist';
  phone?: string;
}): Promise<UserRow> {
  const result = await pool.query<UserRow>(
    `INSERT INTO users (name, email, password_hash, role, phone)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.name, data.email, data.passwordHash, data.role ?? 'customer', data.phone ?? null]
  );
  return result.rows[0]!;
}
