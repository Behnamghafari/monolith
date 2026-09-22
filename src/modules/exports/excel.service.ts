import { PassThrough } from 'node:stream';
import ExcelJS from 'exceljs';
import type { UserRepository } from '../users/user.repository.js';

export class ExcelExportService {
  constructor(private users: UserRepository) {}
  usersExport() {
    const output = new PassThrough(); const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: output }); const sheet = workbook.addWorksheet('Users');
    sheet.addRow(['Phone','First name','Last name','Role','Department','Status']).commit();
    void (async () => { for await (const user of this.users.streamAll()) sheet.addRow([user.phone,user.firstName,user.lastName,user.roleName,user.departmentName,user.status]).commit(); await workbook.commit(); })().catch((e) => output.destroy(e));
    return output;
  }
}
