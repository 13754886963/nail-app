import { Router } from 'express';
import authRoutes from './auth';
import artistRoutes from './artists';
import styleRoutes from './styles';
import appointmentRoutes from './appointments';
import favoriteRoutes from './favorites';
import categoryRoutes from './categories';
import userRoutes from './users';
import notificationRoutes from './notifications';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/artists', artistRoutes);
router.use('/styles', styleRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/favorites', favoriteRoutes);
router.use('/categories', categoryRoutes);
router.use('/notifications', notificationRoutes);

export default router;
