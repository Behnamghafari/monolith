import { Schema, model } from 'mongoose';

const schema = new Schema({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, trim: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

export const DepartmentModel = model('Department', schema);
