import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthRequest } from '../middlewares/auth';
import * as userService from '../services/userService';
import { getUserStats, switchUserRole, findUserById } from '../repositories/userRepository';
import { getMyComments } from '../repositories/interactionRepository';
import { getFollowingArtists } from '../repositories/followRepository';
import { getFavoriteStyles } from '../repositories/interactionRepository';
import { createArtist, findArtistByUserId } from '../repositories/artistRepository';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';

const BASE_URL = process.env['BASE_URL'] ?? `http://localhost:${process.env['PORT'] ?? 3000}`;

export const updateProfileValidation = [
  body('name').optional().trim().notEmpty().withMessage('姓名不能为空').isLength({ max: 50 }),
  body('phone').optional({ nullable: true }).isMobilePhone('any').withMessage('手机号格式不正确'),
  body('email').optional().isEmail().withMessage('邮箱格式不正确').normalizeEmail(),
  body('gender').optional({ nullable: true }).isIn(['male', 'female', 'private']).withMessage('性别值无效'),
  body('birthday').optional({ nullable: true }).isISO8601().withMessage('生日格式不正确'),
  body('location').optional({ nullable: true }).isLength({ max: 100 }),
];

export const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('请输入当前密码'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('新密码至少 8 位')
    .matches(/[A-Za-z]/).withMessage('新密码须包含字母')
    .matches(/[0-9]/).withMessage('新密码须包含数字'),
];

export async function updateProfile(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({
      success: false,
      message: '输入内容有误',
      errors: errors.array().map((e) => ({ field: (e as { path?: string }).path ?? '', message: e.msg })),
    });
    return;
  }

  const { name, phone, email, gender, birthday, location } = req.body as {
    name?: string; phone?: string; email?: string;
    gender?: string; birthday?: string; location?: string;
  };

  try {
    const user = await userService.updateProfile(req.userId!, { name, phone, email, gender, birthday, location });
    res.json({ success: true, data: user });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === 'USER_NOT_FOUND') {
      res.status(404).json({ success: false, message: e.message });
      return;
    }
    throw err;
  }
}

export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({
      success: false,
      message: '输入内容有误',
      errors: errors.array().map((e) => ({ field: (e as { path?: string }).path ?? '', message: e.msg })),
    });
    return;
  }

  const { currentPassword, newPassword } = req.body as {
    currentPassword: string;
    newPassword: string;
  };

  try {
    await userService.changePassword(req.userId!, currentPassword, newPassword);
    res.json({ success: true, message: '密码修改成功' });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === 'WRONG_PASSWORD') {
      res.status(401).json({ success: false, message: e.message });
      return;
    }
    throw err;
  }
}

export async function getStats(req: AuthRequest, res: Response): Promise<void> {
  const stats = await getUserStats(req.userId!, req.userRole as 'customer' | 'artist');
  res.json({ success: true, data: stats });
}

// TODO: 测试用接口，上线前删除
export async function devSwitchUser(req: AuthRequest, res: Response): Promise<void> {
  const { targetId } = req.body as { targetId?: string };
  if (!targetId) { res.status(400).json({ success: false, message: '缺少 targetId' }); return; }
  const user = await findUserById(targetId);
  if (!user) { res.status(404).json({ success: false, message: '用户不存在' }); return; }
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn } as jwt.SignOptions
  );
  const { password_hash: _, ...safeUser } = user as typeof user & { password_hash: string };
  res.json({ success: true, data: { user: safeUser, token } });
}

// TODO: 测试用接口，上线前删除
export async function devSwitchRole(req: AuthRequest, res: Response): Promise<void> {
  const user = await switchUserRole(req.userId!);
  if (!user) { res.status(404).json({ success: false, message: '用户不存在' }); return; }

  // 切换为 artist 时确保 artists 记录存在
  if (user.role === 'artist') {
    const existing = await findArtistByUserId(user.id);
    if (!existing) await createArtist(user.id);
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn } as jwt.SignOptions
  );
  const { password_hash: _, ...safeUser } = user as typeof user & { password_hash: string };
  res.json({ success: true, data: { user: safeUser, token } });
}

export async function getMyFavorites(req: AuthRequest, res: Response): Promise<void> {
  const favorites = await getFavoriteStyles(req.userId!);
  res.json({ success: true, data: favorites });
}

export async function uploadAvatar(req: AuthRequest, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ success: false, message: '请选择图片文件' });
    return;
  }
  const url = `${BASE_URL}/uploads/${req.file.filename}`;
  const user = await userService.updateAvatar(req.userId!, url);
  res.json({ success: true, data: user });
}

export async function getMyCommentsList(req: AuthRequest, res: Response): Promise<void> {
  const comments = await getMyComments(req.userId!);
  res.json({ success: true, data: comments });
}

export async function getMyFollowing(req: AuthRequest, res: Response): Promise<void> {
  const following = await getFollowingArtists(req.userId!);
  res.json({ success: true, data: following });
}

export async function uploadBackground(req: AuthRequest, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ success: false, message: '请选择图片文件' });
    return;
  }
  const url = `${BASE_URL}/uploads/${req.file.filename}`;
  const user = await userService.updateBackground(req.userId!, url);
  res.json({ success: true, data: user });
}
