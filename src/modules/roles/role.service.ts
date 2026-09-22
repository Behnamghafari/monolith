import type { CacheProvider } from '../../shared/cache/cache-provider.js';
import { AppError } from '../../shared/errors/app-error.js';
import type { RoleRepository } from './role.repository.js';
import type { ClientSession } from 'mongoose';
import type { TransactionRunner } from '../../shared/database/transaction.js';

export class RoleService {
  constructor(private repo: RoleRepository, private cache: CacheProvider, private countUsers: (id: string) => Promise<number>, private syncUsers: (id: string, name: string, session?: ClientSession) => Promise<unknown>, private transaction: TransactionRunner = async (work) => work(undefined as unknown as ClientSession)) {}
  create(data: { name: string; permissions: string[] }) { return this.repo.create(data); }
  async list() { const hit = await this.cache.get<unknown[]>('roles:list'); if (hit) return hit; const rows = await this.repo.list(); await this.cache.set('roles:list', rows, 60); return rows; }
  async get(id: string) { const row = await this.repo.findById(id); if (!row) throw new AppError(404, 'ROLE_NOT_FOUND', 'Role not found'); return row; }
  async update(id: string, data: { name?: string; permissions?: string[]; status?: string }) { const old = await this.get(id); const row = await this.transaction(async (session) => { const updated = await this.repo.update(id, data, session); if (!updated) throw new AppError(404, 'ROLE_NOT_FOUND', 'Role not found'); if (data.name && data.name !== old.name) await this.syncUsers(id, data.name, session); return updated; }); await this.cache.deleteByPrefix('roles:'); return row; }
  async remove(id: string) { if (await this.countUsers(id)) throw new AppError(409, 'ROLE_IN_USE', 'Role is assigned to users'); const row = await this.repo.softDelete(id); await this.cache.deleteByPrefix('roles:'); return row; }
  async restore(id: string) { const row = await this.repo.restore(id); await this.cache.deleteByPrefix('roles:'); return row; }
}
