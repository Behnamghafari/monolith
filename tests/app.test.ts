import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app/create-app.js';

describe('HTTP app', () => {
  it('returns a common envelope for unknown routes', async () => {
    const response = await request(createApp({ registerRoutes: () => undefined })).get('/missing');
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});
