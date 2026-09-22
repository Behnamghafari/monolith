import mongoose from 'mongoose';
import { parseEnv } from '../config/env.js';
import { DepartmentModel } from '../modules/departments/department.model.js';
import { RoleModel } from '../modules/roles/role.model.js';
import { UserModel } from '../modules/users/user.model.js';
import { permissions } from '../modules/roles/permission.js';
import { normalizeIranianPhone } from '../modules/users/phone.js';

const env = parseEnv(process.env); await mongoose.connect(env.MONGODB_URI);
const role = await RoleModel.findOneAndUpdate({ name: 'admin' }, { $setOnInsert: { name: 'admin', permissions, status: 'active' } }, { upsert: true, new: true });
const department = await DepartmentModel.findOneAndUpdate({ name: 'Management' }, { $setOnInsert: { name: 'Management', status: 'active' } }, { upsert: true, new: true });
const phone = normalizeIranianPhone(process.env.ADMIN_PHONE ?? '09120000000');
await UserModel.findOneAndUpdate({ phone }, { $setOnInsert: { phone, firstName: 'System', lastName: 'Admin', roleId: role._id, roleName: role.name, departmentId: department._id, departmentName: department.name, status: 'active' } }, { upsert: true });
await mongoose.disconnect(); console.info('Seed completed');
