import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { authorize } from '../src/shared/http/authorize.js';

describe('authorize', () => {
  it('returns 403 when permission is missing', async () => {
    const app = express();
    app.use((req, _res, next) => { (req as typeof req & { auth: { permissions: string[] } }).auth = { permissions: [] }; next(); });
    app.get('/', authorize('users:read'), (_req, res) => res.sendStatus(204));
    app.use((error: { status: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => res.sendStatus(error.status));
    expect((await request(app).get('/')).status).toBe(403);
  });
});
