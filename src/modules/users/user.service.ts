import { AppError } from '../../shared/errors/app-error.js';
import type { DepartmentService } from '../departments/department.service.js';
import type { RoleService } from '../roles/role.service.js';
import { normalizeIranianPhone } from './phone.js';
import type { UserRepository } from './user.repository.js';

export class UserService {
  constructor(private repo: UserRepository, private roles: RoleService, private departments: DepartmentService) {}
  async create(input: Record<string, unknown> & { phone: string; roleId: string; departmentId: string }) {
    const [role, department] = await Promise.all([this.roles.get(input.roleId), this.departments.get(input.departmentId)]);
    return this.repo.create({ ...input, phone: normalizeIranianPhone(input.phone), roleName: role.name, departmentName: department.name });
  }
  list(query: Record<string, unknown>, page?: number, limit?: number) { return this.repo.list(query, page, limit); }
  async get(id: string) { const user = await this.repo.findById(id); if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found'); return user; }
  async update(id: string, input: Record<string, unknown>) {
    const data = { ...input };
    if (typeof input.phone === 'string') data.phone = normalizeIranianPhone(input.phone);
    if (typeof input.roleId === 'string') { const role = await this.roles.get(input.roleId); data.roleName = role.name; }
    if (typeof input.departmentId === 'string') { const dep = await this.departments.get(input.departmentId); data.departmentName = dep.name; }
    const user = await this.repo.update(id, data); if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found'); return user;
  }
  remove(id: string) { return this.repo.softDelete(id); }
  restore(id: string) { return this.repo.restore(id); }
}
