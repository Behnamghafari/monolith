import { RoleModel } from './role.model.js';
import type { ClientSession } from 'mongoose';
export class RoleRepository {
  create(data: { name: string; permissions: string[] }) { return RoleModel.create(data); }
  list() { return RoleModel.find({ deletedAt: null }).sort({ name: 1 }).lean(); }
  findById(id: string) { return RoleModel.findOne({ _id: id, deletedAt: null }).lean(); }
  update(id: string, data: Record<string, unknown>, session?: ClientSession) { return RoleModel.findByIdAndUpdate(id, data, { new: true, session }).lean(); }
  softDelete(id: string) { return RoleModel.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true }).lean(); }
  restore(id: string) { return RoleModel.findByIdAndUpdate(id, { deletedAt: null }, { new: true }).lean(); }
}
