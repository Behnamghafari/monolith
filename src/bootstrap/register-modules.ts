import type { AppEnv } from '../config/env.js';
import { AuthService } from '../modules/auth/auth.service.js';
import { TokenService } from '../modules/auth/token.service.js';
import { DepartmentRepository } from '../modules/departments/department.repository.js';
import { DepartmentService } from '../modules/departments/department.service.js';
import { ExcelExportService } from '../modules/exports/excel.service.js';
import { PdfExportService } from '../modules/exports/pdf.service.js';
import { RoleRepository } from '../modules/roles/role.repository.js';
import { RoleService } from '../modules/roles/role.service.js';
import { ConsoleSmsProvider } from '../modules/sms/console.provider.js';
import { SmsService } from '../modules/sms/sms.service.js';
import { UserRepository } from '../modules/users/user.repository.js';
import { UserService } from '../modules/users/user.service.js';
import type { CoreServices } from './register-core.js';

export function registerModules(env: AppEnv, core: CoreServices) {
  const usersRepo = new UserRepository();
  const departments = new DepartmentService(new DepartmentRepository(), core.cache, (id) => usersRepo.countByDepartment(id), (id, name, session) => usersRepo.updateDepartmentSnapshot(id, name, session), core.transaction);
  const roles = new RoleService(new RoleRepository(), core.cache, (id) => usersRepo.countByRole(id), (id, name, session) => usersRepo.updateRoleSnapshot(id, name, session), core.transaction);
  const users = new UserService(usersRepo, roles, departments); const tokens = new TokenService(env.JWT_ACCESS_SECRET, env.JWT_REFRESH_SECRET);
  return { departments, roles, users, tokens, auth: new AuthService(new SmsService(new ConsoleSmsProvider()), usersRepo, roles, tokens), excel: new ExcelExportService(usersRepo), pdf: new PdfExportService(env.BROWSER_WS_ENDPOINT) };
}
