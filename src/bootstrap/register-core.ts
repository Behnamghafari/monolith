import { NodeCacheProvider } from '../shared/cache/node-cache.provider.js';
import { withTransaction } from '../shared/database/transaction.js';
export const registerCore = () => ({ cache: new NodeCacheProvider(), transaction: withTransaction });
export type CoreServices = ReturnType<typeof registerCore>;
