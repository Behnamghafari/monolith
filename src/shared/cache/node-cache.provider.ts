import NodeCache from 'node-cache';
import type { CacheProvider } from './cache-provider.js';

export class NodeCacheProvider implements CacheProvider {
  private readonly store = new NodeCache({ useClones: false, checkperiod: 60 });
  async get<T>(key: string) { return this.store.get<T>(key); }
  async set<T>(key: string, value: T, ttlSeconds: number) { this.store.set(key, value, ttlSeconds); }
  async delete(key: string) { this.store.del(key); }
  async deleteByPrefix(prefix: string) { this.store.del(this.store.keys().filter((key) => key.startsWith(prefix))); }
  async has(key: string) { return this.store.has(key); }
  async close() { this.store.close(); }
}
