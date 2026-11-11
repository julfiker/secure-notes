import jwt from 'jsonwebtoken';
import { JwtPayload, UserRole } from '../types';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }
  return secret;
};

export const generateToken = (payload: { id: string; email: string; role: UserRole }): string => {
  const secret = getJwtSecret();
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'];

  return jwt.sign(payload, secret, {
    expiresIn,
  });
};

export const verifyToken = (token: string): JwtPayload => {
  const secret = getJwtSecret();
  const decoded = jwt.verify(token, secret) as jwt.JwtPayload & JwtPayload;

  return {
    id: decoded.id,
    email: decoded.email,
    role: decoded.role,
  };
};

