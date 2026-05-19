import bcrypt from 'bcryptjs';
import {
  findUserById,
  updateUser,
  updatePassword,
  updateAvatarUrl,
  updateBackgroundUrl,
} from '../repositories/userRepository';
import type { SafeUser } from './authService';

class AppError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

function sanitize(user: Record<string, unknown>): SafeUser {
  const { password_hash: _, ...rest } = user;
  return rest as SafeUser;
}

export async function updateProfile(
  userId: string,
  data: { name?: string; phone?: string | null; email?: string; gender?: string | null; birthday?: string | null; location?: string | null }
): Promise<SafeUser> {
  const user = await updateUser(userId, data);
  if (!user) throw new AppError('用户不存在', 'USER_NOT_FOUND');
  return sanitize(user as unknown as Record<string, unknown>);
}

export async function updateAvatar(userId: string, url: string): Promise<SafeUser> {
  const user = await updateAvatarUrl(userId, url);
  if (!user) throw new AppError('用户不存在', 'USER_NOT_FOUND');
  return sanitize(user as unknown as Record<string, unknown>);
}

export async function updateBackground(userId: string, url: string): Promise<SafeUser> {
  const user = await updateBackgroundUrl(userId, url);
  if (!user) throw new AppError('用户不存在', 'USER_NOT_FOUND');
  return sanitize(user as unknown as Record<string, unknown>);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await findUserById(userId);
  if (!user) throw new AppError('用户不存在', 'USER_NOT_FOUND');

  const valid = await bcrypt.compare(currentPassword, user.password_hash);
  if (!valid) throw new AppError('当前密码不正确', 'WRONG_PASSWORD');

  const hash = await bcrypt.hash(newPassword, 12);
  await updatePassword(userId, hash);
}
