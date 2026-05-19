import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findUserByEmail, findUserById, createUser } from '../repositories/userRepository';
import { createArtist } from '../repositories/artistRepository';
import { jwtConfig } from '../config/jwt';

export type SafeUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  background_url: string | null;
  role: 'customer' | 'artist';
  gender: string | null;
  birthday: Date | null;
  location: string | null;
  created_at: Date;
  updated_at: Date;
};

function sanitize(user: Record<string, unknown>): SafeUser {
  const { password_hash: _, ...rest } = user;
  return rest as SafeUser;
}

function signToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
  } as jwt.SignOptions);
}

class AppError extends Error {
  constructor(message: string, public code: string) {
    super(message);
  }
}

export async function register(
  name: string,
  email: string,
  password: string,
  role: 'customer' | 'artist' = 'customer',
  phone?: string
): Promise<{ user: SafeUser; token: string }> {
  const existing = await findUserByEmail(email);
  if (existing) throw new AppError('该邮箱已被注册', 'EMAIL_EXISTS');

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await createUser({ name, email, passwordHash, role, phone });

  if (role === 'artist') {
    await createArtist(user.id);
  }

  const token = signToken(user.id, user.role);
  return { user: sanitize(user as unknown as Record<string, unknown>), token };
}

export async function login(
  email: string,
  password: string
): Promise<{ user: SafeUser; token: string }> {
  const user = await findUserByEmail(email);
  if (!user) throw new AppError('该账号不存在，请先注册', 'USER_NOT_FOUND');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw new AppError('密码错误，请重新输入', 'WRONG_PASSWORD');

  const token = signToken(user.id, user.role);
  return { user: sanitize(user as unknown as Record<string, unknown>), token };
}

export async function getMe(userId: string): Promise<SafeUser> {
  const user = await findUserById(userId);
  if (!user) throw new AppError('用户不存在', 'USER_NOT_FOUND');
  return sanitize(user as unknown as Record<string, unknown>);
}
