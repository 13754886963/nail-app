import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../middlewares/auth';
import { findArtistByUserId } from '../repositories/artistRepository';
import {
  createAppointment,
  getCustomerAppointments,
  getArtistAppointments,
  getAppointmentById,
  updateAppointmentStatus,
} from '../repositories/appointmentRepository';
import { createNotification } from '../repositories/notificationRepository';

export const createAppointmentValidation = [
  body('artistId').isUUID().withMessage('艺术师ID无效'),
  body('scheduledAt').isISO8601().withMessage('请选择有效的日期时间'),
  body('styleId').optional({ nullable: true }).isUUID(),
  body('note').optional({ nullable: true }).isLength({ max: 500 }),
];

export const updateStatusValidation = [
  body('action').isIn(['confirm', 'reject', 'cancel', 'complete']).withMessage('无效操作'),
  body('rejectReason').optional({ nullable: true }).isLength({ max: 200 }),
];

export async function bookAppointment(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, message: errors.array()[0]?.msg });
    return;
  }
  const { artistId, scheduledAt, styleId, note } = req.body as {
    artistId: string;
    scheduledAt: string;
    styleId?: string | null;
    note?: string | null;
  };
  const appointment = await createAppointment({
    customerId: req.userId!,
    artistId,
    styleId: styleId ?? null,
    scheduledAt: new Date(scheduledAt),
    note: note ?? null,
  });
  // 通知美甲师有新预约
  const dt = new Date(scheduledAt);
  const dateStr = dt.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  await createNotification({
    userId: appointment.artist_user_id,
    type: 'new_booking',
    title: '你有新的预约请求',
    body: `顾客 ${appointment.customer_name} 预约了 ${dateStr}`,
    appointmentId: appointment.id,
  }).catch(() => {});

  res.status(201).json({ success: true, data: appointment });
}

export async function myAppointments(req: AuthRequest, res: Response): Promise<void> {
  const list = await getCustomerAppointments(req.userId!);
  res.json({ success: true, data: list });
}

export async function incomingAppointments(req: AuthRequest, res: Response): Promise<void> {
  const artist = await findArtistByUserId(req.userId!);
  if (!artist) {
    res.status(403).json({ success: false, message: '仅限美甲师操作' });
    return;
  }
  const list = await getArtistAppointments(artist.id);
  res.json({ success: true, data: list });
}

export async function getAppointment(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const appt = await getAppointmentById(id);
  if (!appt) {
    res.status(404).json({ success: false, message: '预约不存在' });
    return;
  }
  const artist = await findArtistByUserId(req.userId!);
  const isArtist = artist?.id === appt.artist_id;
  const isCustomer = req.userId === appt.customer_id;
  if (!isArtist && !isCustomer) {
    res.status(403).json({ success: false, message: '无权查看' });
    return;
  }
  res.json({ success: true, data: appt });
}

export async function changeStatus(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, message: errors.array()[0]?.msg });
    return;
  }
  const { id } = req.params as { id: string };
  const { action, rejectReason } = req.body as { action: string; rejectReason?: string };

  const appt = await getAppointmentById(id);
  if (!appt) {
    res.status(404).json({ success: false, message: '预约不存在' });
    return;
  }

  const artist = await findArtistByUserId(req.userId!);
  const isArtist = artist?.id === appt.artist_id;
  const isCustomer = req.userId === appt.customer_id;

  const allowed = (() => {
    if (action === 'confirm' || action === 'reject' || action === 'complete') return isArtist;
    if (action === 'cancel') return isCustomer || isArtist;
    return false;
  })();

  if (!allowed) {
    res.status(403).json({ success: false, message: '无权执行此操作' });
    return;
  }

  const statusMap: Record<string, 'confirmed' | 'rejected' | 'cancelled' | 'completed'> = {
    confirm: 'confirmed',
    reject: 'rejected',
    cancel: 'cancelled',
    complete: 'completed',
  };

  const updated = await updateAppointmentStatus(id, statusMap[action]!, rejectReason);

  // 通知对方
  if (updated) {
    const apptDt = new Date(updated.scheduled_at);
    const apptDate = apptDt.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const notifMap: Record<string, { userId: string; type: string; title: string; body: string }> = {
      confirm: {
        userId: updated.customer_id,
        type: 'booking_confirmed',
        title: '预约已确认',
        body: `美甲师 ${updated.artist_name} 确认了你 ${apptDate} 的预约`,
      },
      reject: {
        userId: updated.customer_id,
        type: 'booking_rejected',
        title: '预约被拒绝',
        body: `美甲师 ${updated.artist_name} 拒绝了你 ${apptDate} 的预约`,
      },
      cancel: {
        userId: isArtist ? updated.customer_id : updated.artist_user_id,
        type: 'booking_cancelled',
        title: isArtist ? '美甲师取消了预约' : '顾客取消了预约',
        body: isArtist
          ? `美甲师 ${updated.artist_name} 取消了 ${apptDate} 的预约`
          : `顾客 ${updated.customer_name} 取消了 ${apptDate} 的预约`,
      },
      complete: {
        userId: updated.customer_id,
        type: 'booking_completed',
        title: '服务已完成',
        body: `你 ${apptDate} 与 ${updated.artist_name} 的预约已完成`,
      },
    };
    const notif = notifMap[action];
    if (notif) {
      await createNotification({ ...notif, appointmentId: updated.id }).catch(() => {});
    }
  }

  res.json({ success: true, data: updated });
}
