import { Schema, model } from 'mongoose';
import { permissions } from './permission.js';

const schema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  permissions: [{ type: String, enum: permissions }],
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });
export const RoleModel = model('Role', schema);
