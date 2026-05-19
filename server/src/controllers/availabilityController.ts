import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../middlewares/auth';
import { findArtistByUserId } from '../repositories/artistRepository';
import { getArtistAvailability, upsertArtistAvailability } from '../repositories/availabilityRepository';

export async function getAvailability(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const schedule = await getArtistAvailability(id);
  res.json({ success: true, data: schedule });
}

export async function getMyAvailability(req: AuthRequest, res: Response): Promise<void> {
  const artist = await findArtistByUserId(req.userId!);
  if (!artist) { res.status(404).json({ success: false, message: '美甲师档案不存在' }); return; }
  const schedule = await getArtistAvailability(artist.id);
  res.json({ success: true, data: schedule });
}

export async function setAvailability(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { res.status(400).json({ success: false, errors: errors.array() }); return; }
  const artist = await findArtistByUserId(req.userId!);
  if (!artist) { res.status(404).json({ success: false, message: '美甲师档案不存在' }); return; }
  await upsertArtistAvailability(artist.id, req.body.schedule);
  const schedule = await getArtistAvailability(artist.id);
  res.json({ success: true, data: schedule });
}

export const setAvailabilityValidation = [
  body('schedule').isArray({ min: 1, max: 7 }),
  body('schedule.*.day_of_week').isInt({ min: 0, max: 6 }),
  body('schedule.*.is_available').isBoolean(),
  body('schedule.*.start_time').matches(/^\d{2}:\d{2}$/),
  body('schedule.*.end_time').matches(/^\d{2}:\d{2}$/),
];
