import { AuditLogModel } from './audit-log.model.js';
const blocked = new Set(['otp','code','accessToken','refreshToken','authorization']);
export class AuditLogService {
  record(input: { actorId?: string; action: string; resource: string; resourceId?: string; changes?: Record<string, unknown>; requestId?: string }) {
    const changes = Object.fromEntries(Object.entries(input.changes ?? {}).filter(([key]) => !blocked.has(key)));
    return AuditLogModel.create({ ...input, changes });
  }
  list(page = 1, limit = 50) { return AuditLogModel.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(); }
}
