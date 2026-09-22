import { describe, expect, it, vi } from 'vitest';
import { DepartmentService } from '../src/modules/departments/department.service.js';
import { RoleService } from '../src/modules/roles/role.service.js';

const cache = { get: vi.fn(), set: vi.fn(), delete: vi.fn(), deleteByPrefix: vi.fn(), has: vi.fn(), close: vi.fn() };

describe('protected resources', () => {
  it('prevents deleting an assigned department', async () => {
    const service = new DepartmentService({} as never, cache, async () => 1, vi.fn());
    await expect(service.remove('507f1f77bcf86cd799439011')).rejects.toMatchObject({ code: 'DEPARTMENT_IN_USE' });
  });

  it('prevents deleting an assigned role', async () => {
    const service = new RoleService({} as never, cache, async () => 1, vi.fn());
    await expect(service.remove('507f1f77bcf86cd799439011')).rejects.toMatchObject({ code: 'ROLE_IN_USE' });
  });
});
