import type { ClientSession } from 'mongoose';
import { UserModel } from './user.model.js';

export class UserRepository {
  create(data: Record<string, unknown>) { return UserModel.create(data); }
  findById(id: string) { return UserModel.findOne({ _id: id, deletedAt: null }).lean(); }
  findByPhone(phone: string) { return UserModel.findOne({ phone, deletedAt: null }).lean(); }
  async list(query: Record<string, unknown>, page = 1, limit = 20) {
    const filter = { ...query, deletedAt: null };
    const [items, total] = await Promise.all([UserModel.find(filter).skip((page - 1) * limit).limit(limit).sort({ createdAt: -1 }).lean(), UserModel.countDocuments(filter)]);
    return { items, total, page, limit };
  }
  update(id: string, data: Record<string, unknown>) { return UserModel.findByIdAndUpdate(id, data, { new: true }).lean(); }
  softDelete(id: string) { return this.update(id, { deletedAt: new Date() }); }
  restore(id: string) { return this.update(id, { deletedAt: null }); }
  countByRole(roleId: string) { return UserModel.countDocuments({ roleId, deletedAt: null }); }
  countByDepartment(departmentId: string) { return UserModel.countDocuments({ departmentId, deletedAt: null }); }
  updateRoleSnapshot(roleId: string, roleName: string, session?: ClientSession) { return UserModel.updateMany({ roleId }, { roleName }, { session }); }
  updateDepartmentSnapshot(departmentId: string, departmentName: string, session?: ClientSession) { return UserModel.updateMany({ departmentId }, { departmentName }, { session }); }
  streamAll() { return UserModel.find({ deletedAt: null }).sort({ _id: 1 }).lean().cursor(); }
}
