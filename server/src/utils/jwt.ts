import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { Response } from 'express';
import { env } from '../config/env';
import { UserRole, AccountStatus } from '../types/express';
import { AppError } from './AppError';

export const REFRESH_COOKIE_NAME = 'learnsphere_refresh_token';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  status: AccountStatus;
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function generateRandomToken(byteLength = 32): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(byteLength).toString('hex');
  return {
    rawToken,
    tokenHash: hashToken(rawToken),
  };
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  } catch {
    throw AppError.unauthorized('Invalid or expired access token');
  }
}

export function signRefreshToken(userId: string): {
  token: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const payload: RefreshTokenPayload = {
    sub: userId,
    jti: crypto.randomUUID(),
  };

  const options: SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
  };

  const token = jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
  const decoded = jwt.decode(token) as { exp?: number } | null;
  const expiresAt = decoded?.exp
    ? new Date(decoded.exp * 1000)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return {
    token,
    tokenHash: hashToken(token),
    expiresAt,
  };
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch {
    throw AppError.unauthorized('Invalid or expired refresh token');
  }
}

export function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/v1/auth',
  });
}
