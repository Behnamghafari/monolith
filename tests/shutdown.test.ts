import { describe, expect, it, vi } from 'vitest';
import { createShutdownManager } from '../src/bootstrap/graceful-shutdown.js';

describe('graceful shutdown', () => {
  it('closes resources once and in order', async () => {
    const calls: string[] = [];
    const shutdown = createShutdownManager([
      { name: 'http', close: async () => { calls.push('http'); } },
      { name: 'cache', close: async () => { calls.push('cache'); } },
    ], 1000, vi.fn());
    await Promise.all([shutdown('SIGTERM'), shutdown('SIGINT')]);
    expect(calls).toEqual(['http', 'cache']);
  });
});
