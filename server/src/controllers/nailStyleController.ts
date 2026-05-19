import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../middlewares/auth';
import { findArtistByUserId } from '../repositories/artistRepository';
import { createNailStyle, getMyNailStyles, getAllNailStyles, searchNailStyles, deleteNailStyle, updateNailStyle } from '../repositories/nailStyleRepository';
import { pool } from '../config/database';

const BASE_URL = process.env['BASE_URL'] ?? `http://localhost:${process.env['PORT'] ?? 3000}`;

export const createStyleValidation = [
  body('title').trim().notEmpty().withMessage('作品标题不能为空').isLength({ max: 100 }),
  body('categoryId').isUUID().withMessage('请选择分类'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('tags').optional().isArray(),
];

async function requireArtist(req: AuthRequest, res: Response): Promise<string | null> {
  if (req.userRole !== 'artist') {
    res.status(403).json({ success: false, message: '仅美甲师可执行此操作' });
    return null;
  }
  const artist = await findArtistByUserId(req.userId!);
  if (!artist) {
    res.status(404).json({ success: false, message: '美甲师档案不存在' });
    return null;
  }
  return artist.id;
}

export async function createStyle(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({
      success: false,
      message: '输入内容有误',
      errors: errors.array().map((e) => ({ field: (e as { path?: string }).path ?? '', message: e.msg })),
    });
    return;
  }

  if (!req.file) {
    res.status(400).json({ success: false, message: '请上传作品图片' });
    return;
  }

  const artistId = await requireArtist(req, res);
  if (!artistId) return;

  const { title, categoryId, description, tags } = req.body as {
    title: string; categoryId: string; description?: string; tags?: string[];
  };

  const imageUrl = `${BASE_URL}/uploads/${req.file.filename}`;
  const style = await createNailStyle({
    artistId,
    categoryId,
    title,
    description,
    tags: Array.isArray(tags) ? tags : [],
    imageUrl,
  });

  res.status(201).json({ success: true, data: style });
}

export async function getMyStyles(req: AuthRequest, res: Response): Promise<void> {
  const artistId = await requireArtist(req, res);
  if (!artistId) return;

  const limit = Math.min(Number(req.query['limit']) || 20, 50);
  const offset = Number(req.query['offset']) || 0;
  const styles = await getMyNailStyles(artistId, limit, offset);
  res.json({ success: true, data: styles });
}

export async function getStyles(req: AuthRequest, res: Response): Promise<void> {
  const limit = Math.min(Number(req.query['limit']) || 20, 50);
  const offset = Number(req.query['offset']) || 0;
  const categoryId = typeof req.query['categoryId'] === 'string' ? req.query['categoryId'] : undefined;
  const styles = await getAllNailStyles(limit, offset, categoryId);
  res.json({ success: true, data: styles });
}

export async function searchStyles(req: AuthRequest, res: Response): Promise<void> {
  const q = typeof req.query['q'] === 'string' ? req.query['q'].trim() : '';
  if (!q) {
    res.json({ success: true, data: [] });
    return;
  }
  const styles = await searchNailStyles(q);
  res.json({ success: true, data: styles });
}

export const updateStyleValidation = [
  body('title').optional().trim().notEmpty().isLength({ max: 100 }),
  body('description').optional({ nullable: true }).trim().isLength({ max: 500 }),
  body('tags').optional().isArray(),
  body('is_public').optional().isBoolean(),
];

export async function updateStyle(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, message: errors.array()[0]?.msg });
    return;
  }
  const artistId = await requireArtist(req, res);
  if (!artistId) return;
  const { id } = req.params as { id: string };
  const { title, description, tags, is_public } = req.body as {
    title?: string; description?: string; tags?: string[]; is_public?: boolean;
  };
  const updated = await updateNailStyle(id, artistId, {
    title,
    description: description !== undefined ? (description.trim() || null) : undefined,
    tags,
    isPublic: is_public,
  });
  if (!updated) {
    res.status(404).json({ success: false, message: '作品不存在或无权限' });
    return;
  }
  res.json({ success: true });
}

export async function deleteStyle(req: AuthRequest, res: Response): Promise<void> {
  const artistId = await requireArtist(req, res);
  if (!artistId) return;
  const { id } = req.params as { id: string };
  const deleted = await deleteNailStyle(id, artistId);
  if (!deleted) {
    res.status(404).json({ success: false, message: '作品不存在或无权限删除' });
    return;
  }
  res.json({ success: true });
}

export async function getCategories(_req: AuthRequest, res: Response): Promise<void> {
  const result = await pool.query(
    'SELECT id, name FROM categories ORDER BY sort_order'
  );
  res.json({ success: true, data: result.rows });
}
