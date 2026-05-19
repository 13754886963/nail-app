import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import {
  updateProfile,
  changePassword,
  getStats,
  getMyFavorites,
  getMyCommentsList,
  getMyFollowing,
  devSwitchRole,
  devSwitchUser,
  uploadAvatar,
  uploadBackground,
  updateProfileValidation,
  changePasswordValidation,
} from '../controllers/userController';
import { upload } from '../config/upload';

const router = Router();

router.get('/me/stats',       authenticate, getStats);
router.get('/me/favorites',   authenticate, getMyFavorites);
router.get('/me/comments',    authenticate, getMyCommentsList);
router.get('/me/following',   authenticate, getMyFollowing);
// TODO: 测试用接口，上线前删除
router.post('/me/dev-switch-role', authenticate, devSwitchRole);
router.post('/me/dev-switch-user', authenticate, devSwitchUser);
router.patch('/me', authenticate, updateProfileValidation, updateProfile);
router.patch('/me/password', authenticate, changePasswordValidation, changePassword);
router.post('/me/avatar', authenticate, upload.single('avatar'), uploadAvatar);
router.post('/me/background', authenticate, upload.single('background'), uploadBackground);

export default router;
