import { pool } from '../config/database';

export interface NailStyleWithImage {
  id: string;
  artist_id: string;
  category_id: string;
  category_name: string;
  artist_name: string;
  title: string;
  description: string | null;
  tags: string[];
  image_url: string | null;
  created_at: Date;
}

export async function createNailStyle(data: {
  artistId: string;
  categoryId: string;
  title: string;
  description?: string;
  tags?: string[];
  imageUrl: string;
}): Promise<NailStyleWithImage> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const styleResult = await client.query<{
      id: string; artist_id: string; category_id: string;
      title: string; description: string | null; tags: string[]; created_at: Date;
    }>(
      `INSERT INTO nail_styles (artist_id, category_id, title, description, tags)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.artistId, data.categoryId, data.title, data.description ?? null, data.tags ?? []]
    );
    const style = styleResult.rows[0]!;

    await client.query(
      `INSERT INTO style_images (style_id, image_url, sort_order) VALUES ($1, $2, 0)`,
      [style.id, data.imageUrl]
    );

    await client.query('COMMIT');

    const [categoryResult, artistResult] = await Promise.all([
      pool.query<{ name: string }>('SELECT name FROM categories WHERE id = $1', [data.categoryId]),
      pool.query<{ name: string }>('SELECT u.name FROM artists a JOIN users u ON u.id = a.user_id WHERE a.id = $1', [data.artistId]),
    ]);

    return {
      ...style,
      category_name: categoryResult.rows[0]?.name ?? '',
      artist_name: artistResult.rows[0]?.name ?? '',
      image_url: data.imageUrl,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

const STYLE_SELECT = `
  SELECT
    ns.id, ns.artist_id, ns.category_id,
    c.name  AS category_name,
    u.name  AS artist_name,
    ns.title, ns.description, ns.tags,
    (SELECT image_url FROM style_images si
     WHERE si.style_id = ns.id ORDER BY si.sort_order LIMIT 1) AS image_url,
    ns.created_at
  FROM nail_styles ns
  JOIN categories c ON c.id = ns.category_id
  JOIN artists    a ON a.id = ns.artist_id
  JOIN users      u ON u.id = a.user_id`;

export async function getMyNailStyles(
  artistId: string,
  limit: number,
  offset: number
): Promise<NailStyleWithImage[]> {
  const result = await pool.query<NailStyleWithImage>(
    `${STYLE_SELECT}
     WHERE ns.artist_id = $1
     ORDER BY ns.created_at DESC, ns.id
     LIMIT $2 OFFSET $3`,
    [artistId, limit, offset]
  );
  return result.rows;
}

export async function getAllNailStyles(
  limit: number,
  offset: number,
  categoryId?: string
): Promise<NailStyleWithImage[]> {
  const params: (string | number)[] = [limit, offset];
  const where = categoryId
    ? `WHERE ns.is_public = TRUE AND ns.category_id = $3`
    : `WHERE ns.is_public = TRUE`;
  if (categoryId) params.push(categoryId);

  const result = await pool.query<NailStyleWithImage>(
    `${STYLE_SELECT}
     ${where}
     ORDER BY ns.created_at DESC, ns.id
     LIMIT $1 OFFSET $2`,
    params
  );
  return result.rows;
}

export async function updateNailStyle(
  styleId: string,
  artistId: string,
  data: { title?: string; description?: string | null; tags?: string[]; isPublic?: boolean },
): Promise<boolean> {
  const clauses: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  if (data.title       !== undefined) { clauses.push(`title       = $${i++}`); values.push(data.title); }
  if (data.description !== undefined) { clauses.push(`description = $${i++}`); values.push(data.description); }
  if (data.tags        !== undefined) { clauses.push(`tags        = $${i++}`); values.push(data.tags); }
  if (data.isPublic    !== undefined) { clauses.push(`is_public   = $${i++}`); values.push(data.isPublic); }
  if (clauses.length === 0) return true;
  values.push(styleId, artistId);
  const result = await pool.query(
    `UPDATE nail_styles SET ${clauses.join(', ')} WHERE id = $${i} AND artist_id = $${i + 1}`,
    values,
  );
  return (result.rowCount ?? 0) > 0;
}

export async function deleteNailStyle(styleId: string, artistId: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM nail_styles WHERE id = $1 AND artist_id = $2',
    [styleId, artistId]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function searchNailStyles(q: string): Promise<NailStyleWithImage[]> {
  const like = `%${q}%`;
  const result = await pool.query<NailStyleWithImage>(
    `${STYLE_SELECT}
     WHERE ns.title ILIKE $1 OR u.name ILIKE $1
     ORDER BY ns.created_at DESC, ns.id
     LIMIT 40`,
    [like]
  );
  return result.rows;
}
