export const openapi = {
  openapi: '3.1.0',
  info: { title: 'Feature-first Modular Monolith API', version: '1.0.0' },
  servers: [{ url: '/api/v1' }],
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  paths: {
    '/auth/request-otp': { post: { summary: 'Request OTP', responses: { '200': { description: 'OTP sent' } } } },
    '/auth/verify-otp': { post: { summary: 'Verify OTP', responses: { '200': { description: 'Tokens issued' } } } },
    '/users': { get: { security: [{ bearerAuth: [] }], summary: 'List users', responses: { '200': { description: 'Users' } } }, post: { security: [{ bearerAuth: [] }], summary: 'Create user', responses: { '201': { description: 'Created' } } } },
    '/roles': { get: { security: [{ bearerAuth: [] }], summary: 'List roles', responses: { '200': { description: 'Roles' } } } },
    '/departments': { get: { security: [{ bearerAuth: [] }], summary: 'List departments', responses: { '200': { description: 'Departments' } } } },
    '/exports/users.xlsx': { get: { security: [{ bearerAuth: [] }], summary: 'Download Excel', responses: { '200': { description: 'Excel file' } } } },
  },
} as const;
