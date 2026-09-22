import { describe, expect, it } from 'vitest';
import { NodeCacheProvider } from '../src/shared/cache/node-cache.provider.js';

describe('NodeCacheProvider', () => {
  it('deletes keys by prefix', async () => {
    const cache = new NodeCacheProvider();
    await cache.set('roles:1', 1, 60);
    await cache.set('users:1', 1, 60);
    await cache.deleteByPrefix('roles:');
    expect(await cache.has('roles:1')).toBe(false);
    expect(await cache.has('users:1')).toBe(true);
  });
});
