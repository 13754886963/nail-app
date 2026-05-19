import dotenv from 'dotenv';

dotenv.config({ path: `.env.${process.env['NODE_ENV'] ?? 'local'}` });

const secret = process.env['JWT_SECRET'];
if (!secret) throw new Error('JWT_SECRET is not set');

export const jwtConfig = {
  secret,
  expiresIn: process.env['JWT_EXPIRES_IN'] ?? '7d',
};
