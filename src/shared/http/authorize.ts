import type { RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';
import type { Permission } from '../../modules/roles/permission.js';

export const authorize = (...required: Permission[]): RequestHandler => (req, _res, next) => {
  const auth = (req as typeof req & { auth?: { permissions?: string[] } }).auth;
  if (!auth || !required.every((permission) => auth.permissions?.includes(permission))) return next(new AppError(403, 'FORBIDDEN', 'Permission denied'));
  next();
};
