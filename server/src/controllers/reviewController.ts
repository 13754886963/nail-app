import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../middlewares/auth';
import {
  createReview,
  getReviewByAppointmentId,
  getArtistReviews,
  setArtistReply,
} from '../repositories/reviewRepository';
import { pool } from '../config/database';

export const createReviewValidation = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('评分须在 1-5 之间'),
  body('comment').optional({ nullable: true }).trim().isLength({ max: 500 }),
];

export const replyValidation = [
  body('reply').trim().notEmpty().withMessage('回复内容不能为空').isLength({ max: 500 }),
];

export async function submitReview(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, message: errors.array()[0]?.msg });
    return;
  }

  const { id: appointmentId } = req.params as { id: string };
  const { rating, comment } = req.body as { rating: number; comment?: string };

  const apptResult = await pool.query<{ customer_id: string; artist_id: string; status: string }>(
    'SELECT customer_id, artist_id, status FROM appointments WHERE id = $1',
    [appointmentId]
  );
  const appt = apptResult.rows[0];
  if (!appt) { res.status(404).json({ success: false, message: '预约不存在' }); return; }
  if (appt.customer_id !== req.userId) { res.status(403).json({ success: false, message: '无权限' }); return; }
  if (appt.status !== 'completed') {
    res.status(400).json({ success: false, message: '只能对已完成的预约进行评价' });
    return;
  }

  const existing = await getReviewByAppointmentId(appointmentId);
  if (existing) { res.status(400).json({ success: false, message: '已经评价过了' }); return; }

  await createReview({
    appointmentId,
    customerId: req.userId!,
    artistId: appt.artist_id,
    rating: Number(rating),
    comment: comment?.trim() || undefined,
  });

  const review = await getReviewByAppointmentId(appointmentId);
  res.status(201).json({ success: true, data: review });
}

export async function getAppointmentReview(req: AuthRequest, res: Response): Promise<void> {
  const { id: appointmentId } = req.params as { id: string };
  const review = await getReviewByAppointmentId(appointmentId);
  res.json({ success: true, data: review });
}

export async function replyToReview(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, message: errors.array()[0]?.msg });
    return;
  }

  const { id: appointmentId } = req.params as { id: string };
  const { reply } = req.body as { reply: string };

  // Verify the requesting user is the artist on this appointment
  const apptResult = await pool.query<{ artist_user_id: string }>(
    `SELECT a.user_id AS artist_user_id
     FROM appointments appt
     JOIN artists a ON a.id = appt.artist_id
     WHERE appt.id = $1`,
    [appointmentId]
  );
  const appt = apptResult.rows[0];
  if (!appt) { res.status(404).json({ success: false, message: '预约不存在' }); return; }
  if (appt.artist_user_id !== req.userId) { res.status(403).json({ success: false, message: '无权限' }); return; }

  const review = await getReviewByAppointmentId(appointmentId);
  if (!review) { res.status(404).json({ success: false, message: '该预约暂无评价' }); return; }

  const updated = await setArtistReply(review.id, reply.trim());
  res.json({ success: true, data: updated });
}

export async function listArtistReviews(req: AuthRequest, res: Response): Promise<void> {
  const { id: artistId } = req.params as { id: string };
  const reviews = await getArtistReviews(artistId);
  res.json({ success: true, data: reviews });
}
