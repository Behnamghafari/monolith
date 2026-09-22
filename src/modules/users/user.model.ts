import { Schema, model } from 'mongoose';

const schema = new Schema({
  phone: { type: String, required: true, unique: true, index: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true, sparse: true, unique: true },
  roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true, index: true },
  roleName: { type: String, required: true },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
  departmentName: { type: String, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });
export const UserModel = model('User', schema);
