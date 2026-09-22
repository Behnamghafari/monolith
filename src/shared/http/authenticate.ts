import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';
import type { TokenService } from '../../modules/auth/token.service.js';

export const authenticate = (tokens: TokenService): RequestHandler => (req, _res, next) => {
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return next(new AppError(401, 'AUTH_REQUIRED', 'Authentication required'));
  try { (req as typeof req & { auth?: unknown }).auth = tokens.verifyAccess(token); next(); } catch { next(new AppError(401, 'TOKEN_INVALID', 'Invalid access token')); }
};
