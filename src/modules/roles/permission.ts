export const permissions = ['users:read','users:create','users:update','users:delete','roles:manage','departments:manage','exports:create','audit-logs:read'] as const;
export type Permission = typeof permissions[number];
