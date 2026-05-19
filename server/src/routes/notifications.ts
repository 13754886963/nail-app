import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import { listNotifications, unreadCount, readAll } from '../controllers/notificationController';

const router = Router();

router.get('/',             authenticate, listNotifications);
router.get('/unread-count', authenticate, unreadCount);
router.patch('/read-all',   authenticate, readAll);

export default router;
