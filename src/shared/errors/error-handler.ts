import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from './app-error.js';

export const notFound: RequestHandler = (_req, res) => res.status(404).json({
  success: false,
  error: { code: 'ROUTE_NOT_FOUND', message: 'Route not found' },
});

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const known = error instanceof AppError;
  const status = known ? error.status : 500;
  res.status(status).json({ success: false, error: {
    code: known ? error.code : 'INTERNAL_ERROR',
    message: known ? error.message : 'Internal server error',
    requestId: req.header('x-request-id'),
    ...(known && error.details ? { details: error.details } : {}),
  }});
};
