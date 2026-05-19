import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import * as authService from '../services/authService';
import { AuthRequest } from '../middlewares/auth';

export const registerValidation = [
  body('name').trim().notEmpty().withMessage('姓名不能为空').isLength({ max: 50 }),
  body('email').isEmail().withMessage('邮箱格式不正确').normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('密码至少 8 位')
    .matches(/[A-Za-z]/).withMessage('密码须包含字母')
    .matches(/[0-9]/).withMessage('密码须包含数字'),
  body('phone').optional({ nullable: true }).isMobilePhone('any'),
  body('role').optional().isIn(['customer', 'artist']).withMessage('身份只能是 customer 或 artist'),
];

export const loginValidation = [
  body('email').isEmail().withMessage('邮箱格式不正确').normalizeEmail(),
  body('password').notEmpty().withMessage('密码不能为空'),
];

export async function register(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({
      success: false,
      message: '输入内容有误',
      errors: errors.array().map((e) => ({ field: (e as { path?: string }).path ?? '', message: e.msg })),
    });
    return;
  }

  const { name, email, password, phone, role } = req.body as {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role?: 'customer' | 'artist';
  };

  try {
    const result = await authService.register(name, email, password, role ?? 'customer', phone);
    res.status(201).json({ success: true, data: result });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === 'EMAIL_EXISTS') {
      res.status(409).json({ success: false, message: e.message });
      return;
    }
    throw err;
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, message: '输入内容有误' });
    return;
  }

  const { email, password } = req.body as { email: string; password: string };

  try {
    const result = await authService.login(email, password);
    res.json({ success: true, data: result });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e.code === 'USER_NOT_FOUND' || e.code === 'WRONG_PASSWORD') {
      res.status(401).json({ success: false, message: e.message });
      return;
    }
    throw err;
  }
}

export async function me(req: AuthRequest, res: Response): Promise<void> {
  const user = await authService.getMe(req.userId!);
  res.json({ success: true, data: user });
}
