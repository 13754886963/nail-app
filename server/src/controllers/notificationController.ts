import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import {
  getUserNotifications,
  getUnreadCount,
  markAllRead,
} from '../repositories/notificationRepository';

export async function listNotifications(req: AuthRequest, res: Response): Promise<void> {
  const notifications = await getUserNotifications(req.userId!);
  res.json({ success: true, data: notifications });
}

export async function unreadCount(req: AuthRequest, res: Response): Promise<void> {
  const count = await getUnreadCount(req.userId!);
  res.json({ success: true, data: { count } });
}

export async function readAll(req: AuthRequest, res: Response): Promise<void> {
  await markAllRead(req.userId!);
  res.json({ success: true });
}
