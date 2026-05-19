import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../middlewares/auth';
import {
  getStyleDetail,
  toggleLike,
  toggleFavorite,
  getComments,
  addComment,
} from '../repositories/interactionRepository';

export const commentValidation = [
  body('content').trim().notEmpty().withMessage('评论不能为空').isLength({ max: 500 }),
  body('parent_id').optional({ nullable: true }).isUUID(),
  body('reply_to_user_name').optional({ nullable: true }).trim().isLength({ max: 100 }),
];

export async function getDetail(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const detail = await getStyleDetail(id, req.userId!);
  if (!detail) {
    res.status(404).json({ success: false, message: '作品不存在' });
    return;
  }
  res.json({ success: true, data: detail });
}

export async function like(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const liked = await toggleLike(id, req.userId!);
  res.json({ success: true, data: { liked } });
}

export async function favorite(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const favorited = await toggleFavorite(id, req.userId!);
  res.json({ success: true, data: { favorited } });
}

export async function listComments(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const comments = await getComments(id);
  res.json({ success: true, data: comments });
}

export async function postComment(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, message: errors.array()[0]?.msg });
    return;
  }
  const { id } = req.params as { id: string };
  const { content, parent_id, reply_to_user_name } = req.body as {
    content: string;
    parent_id?: string;
    reply_to_user_name?: string;
  };
  const comment = await addComment(id, req.userId!, content, parent_id, reply_to_user_name);
  res.status(201).json({ success: true, data: comment });
}
