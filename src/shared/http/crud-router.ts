import { Router, type RequestHandler } from 'express';
import { asyncHandler } from './async-handler.js';

type CrudService = { create(data: Record<string, unknown>): unknown; list(): unknown; get(id: string): unknown; update(id: string, data: Record<string, unknown>): unknown; remove(id: string): unknown; restore(id: string): unknown };
const idOf = (value: string | string[]) => Array.isArray(value) ? value[0]! : value;

export function crudRouter(service: CrudService, guard: RequestHandler = (_req, _res, next) => next()) {
  const router = Router();
  router.use(guard);
  router.post('/', asyncHandler(async (req, res) => { res.status(201).json({ success: true, data: await service.create(req.body) }); }));
  router.get('/', asyncHandler(async (_req, res) => { res.json({ success: true, data: await service.list() }); }));
  router.get('/:id', asyncHandler(async (req, res) => { res.json({ success: true, data: await service.get(idOf(req.params.id!)) }); }));
  router.patch('/:id', asyncHandler(async (req, res) => { res.json({ success: true, data: await service.update(idOf(req.params.id!), req.body) }); }));
  router.delete('/:id', asyncHandler(async (req, res) => { res.json({ success: true, data: await service.remove(idOf(req.params.id!)) }); }));
  router.post('/:id/restore', asyncHandler(async (req, res) => { res.json({ success: true, data: await service.restore(idOf(req.params.id!)) }); }));
  return router;
}
