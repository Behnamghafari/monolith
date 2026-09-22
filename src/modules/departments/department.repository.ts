import type { ClientSession } from 'mongoose';
import { DepartmentModel } from './department.model.js';

export class DepartmentRepository {
  create(data: { name: string; description?: string }) { return DepartmentModel.create(data); }
  list() { return DepartmentModel.find({ deletedAt: null }).sort({ name: 1 }).lean(); }
  findById(id: string) { return DepartmentModel.findOne({ _id: id, deletedAt: null }).lean(); }
  update(id: string, data: Record<string, unknown>, session?: ClientSession) {
    return DepartmentModel.findByIdAndUpdate(id, data, { new: true, session }).lean();
  }
  softDelete(id: string) { return DepartmentModel.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true }).lean(); }
  restore(id: string) { return DepartmentModel.findByIdAndUpdate(id, { deletedAt: null }, { new: true }).lean(); }
}
