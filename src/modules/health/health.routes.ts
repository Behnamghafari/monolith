import { Router } from 'express';
import mongoose from 'mongoose';
export const healthRouter = () => {
  const router = Router();
  router.get('/live', (_req, res) => res.json({ status: 'ok' }));
  router.get('/ready', (_req, res) => mongoose.connection.readyState === 1 ? res.json({ status: 'ready' }) : res.status(503).json({ status: 'not-ready' }));
  return router;
};
