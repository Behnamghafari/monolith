# Feature-first Layered Modular Monolith Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ساخت یک API مدیریتی production-style با Express، TypeScript و MongoDB شامل Auth پیامکی، User، Role، Department، کش، PDF، Excel، Audit Log و Graceful Shutdown.

**Architecture:** برنامه یک Feature-first Layered Modular Monolith است. هر Feature مسیر `route -> controller -> service -> repository -> model` دارد و Composition Root وابستگی‌ها را در چند فایل bootstrap متصل می‌کند؛ پروژه Clean Architecture نیست.

**Tech Stack:** Node.js 22، TypeScript، Express 5، MongoDB، Mongoose، Zod، node-cache، JWT، Puppeteer، ExcelJS، Pino، Vitest، Supertest و Docker Compose.

**Spec:** `docs/superpowers/specs/2026-09-18-feature-first-modular-monolith-design.md`

## Global Constraints

- TypeScript باید با `strict: true` اجرا شود.
- MongoDB توسعه باید Replica Set باشد تا transactionهای تغییر نام قابل اجرا باشند.
- ماژول‌ها فقط از export عمومی `index.ts` یکدیگر استفاده کنند.
- Controller نباید مستقیم به Model یا Repository ماژول دیگر دسترسی داشته باشد.
- OTP و Token خام در دیتابیس یا log ذخیره نشوند.
- تمام endpointهای مدیریتی باید Permission صریح داشته باشند.
- تمام عملیات export باید محدودیت زمان و حافظه داشته باشند.
- هر Task با تست شکست‌خورده آغاز، با تست سبز تمام و جداگانه commit شود.

## File Map

```text
src/
├── app/{create-app,middleware,routes}.ts
├── bootstrap/{container,register-core,register-modules,start-server,graceful-shutdown}.ts
├── config/{env,constants}.ts
├── modules/
│   ├── departments/{model,types,validation,repository,service,controller,routes,index}.ts
│   ├── roles/{model,types,validation,repository,service,controller,routes,index}.ts
│   ├── users/{model,types,validation,repository,service,controller,routes,index}.ts
│   ├── sms/{types,service,console.provider,index}.ts
│   ├── auth/{otp.model,session.model,validation,repository,token.service,service,controller,routes,index}.ts
│   ├── exports/{pdf.service,excel.service,controller,routes,index}.ts
│   └── audit-logs/{model,repository,service,middleware,routes,index}.ts
├── shared/
│   ├── cache/{cache-provider,node-cache.provider,index}.ts
│   ├── database/{connect,transaction}.ts
│   ├── errors/{app-error,error-handler}.ts
│   ├── events/{event-bus}.ts
│   ├── http/{async-handler,authenticate,authorize,request-context}.ts
│   └── logger/{logger}.ts
└── main.ts
tests/{unit,integration,api}/
```

---

### Task 1: Project foundation and executable HTTP app

**Files:**
- Create: `package.json`, `tsconfig.json`, `eslint.config.js`, `.env.example`, `.gitignore`
- Create: `src/config/env.ts`, `src/app/create-app.ts`, `src/main.ts`
- Test: `tests/api/health-smoke.test.ts`

**Interfaces:**
- Produces: `parseEnv(input: NodeJS.ProcessEnv): AppEnv`
- Produces: `createApp(deps: AppDependencies): Express`

- [ ] **Step 1: Write a failing smoke test**

```ts
import request from 'supertest';
import { createApp } from '../../src/app/create-app.js';

it('returns 404 using the common envelope', async () => {
  const response = await request(createApp({ logger: false })).get('/missing');
  expect(response.status).toBe(404);
  expect(response.body.error.code).toBe('ROUTE_NOT_FOUND');
});
```

- [ ] **Step 2: Install dependencies and verify failure**

Run: `npm install && npm test -- health-smoke`

Expected: FAIL because `create-app.ts` does not exist.

- [ ] **Step 3: Implement strict config and app factory**

```ts
export interface AppDependencies { logger: false | import('pino').Logger }

export function createApp(deps: AppDependencies) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use((_req, res) => res.status(404).json({
    success: false,
    error: { code: 'ROUTE_NOT_FOUND', message: 'Route not found' },
  }));
  return app;
}
```

- [ ] **Step 4: Run quality gates**

Run: `npm run typecheck && npm test -- health-smoke`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json eslint.config.js .env.example .gitignore src tests
git commit -m "chore: bootstrap strict express typescript app"
```

### Task 2: Shared errors, request context, MongoDB and Composition Root

**Files:**
- Create: `src/shared/errors/app-error.ts`, `src/shared/errors/error-handler.ts`
- Create: `src/shared/http/async-handler.ts`, `src/shared/http/request-context.ts`
- Create: `src/shared/database/connect.ts`, `src/shared/database/transaction.ts`
- Create: `src/shared/logger/logger.ts`
- Create: `src/bootstrap/container.ts`, `src/bootstrap/register-core.ts`
- Modify: `src/app/create-app.ts`
- Test: `tests/unit/app-error.test.ts`, `tests/api/request-context.test.ts`

**Interfaces:**
- Produces: `AppError(status: number, code: string, message: string, details?: unknown)`
- Produces: `connectDatabase(uri: string): Promise<typeof mongoose>`
- Produces: `withTransaction<T>(work: (session: ClientSession) => Promise<T>): Promise<T>`

- [ ] **Step 1: Write failing error-envelope test**

```ts
it('serializes operational errors without a stack', () => {
  const error = new AppError(409, 'RESOURCE_IN_USE', 'Resource is in use');
  expect(toErrorBody(error, 'req-1')).toEqual({
    success: false,
    error: { code: 'RESOURCE_IN_USE', message: 'Resource is in use', requestId: 'req-1' },
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- app-error request-context`

Expected: FAIL because shared error modules are missing.

- [ ] **Step 3: Implement typed errors, AsyncLocalStorage request IDs and database lifecycle**

```ts
export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) { super(message); }
}
```

`registerCore` must create logger and database services but must not open an HTTP port.

- [ ] **Step 4: Run tests**

Run: `npm run typecheck && npm test -- app-error request-context`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared src/bootstrap src/app tests
git commit -m "feat: add shared runtime and composition root core"
```

### Task 3: Replaceable cache and synchronous event bus

**Files:**
- Create: `src/shared/cache/cache-provider.ts`, `src/shared/cache/node-cache.provider.ts`, `src/shared/cache/index.ts`
- Create: `src/shared/events/event-bus.ts`
- Modify: `src/bootstrap/register-core.ts`
- Test: `tests/unit/node-cache.provider.test.ts`, `tests/unit/event-bus.test.ts`

**Interfaces:**
- Produces: `CacheProvider` with `get<T>`, `set<T>`, `delete`, `deleteByPrefix`, `has`, `close`
- Produces: `EventBus.publish<T>(event: DomainEvent<T>): Promise<void>`

- [ ] **Step 1: Write failing cache contract test**

```ts
it('deletes every key with a prefix', async () => {
  await cache.set('roles:1', { id: 1 }, 60);
  await cache.set('roles:2', { id: 2 }, 60);
  await cache.set('users:1', { id: 1 }, 60);
  await cache.deleteByPrefix('roles:');
  expect(await cache.has('roles:1')).toBe(false);
  expect(await cache.has('users:1')).toBe(true);
});
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- node-cache event-bus`

Expected: FAIL because providers are missing.

- [ ] **Step 3: Implement provider and event bus**

```ts
export interface CacheProvider {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
  deleteByPrefix(prefix: string): Promise<void>;
  has(key: string): Promise<boolean>;
  close(): Promise<void>;
}
```

Event handlers execute with `Promise.allSettled`; failures are logged and returned to the publisher for explicit handling.

- [ ] **Step 4: Run tests and commit**

Run: `npm run typecheck && npm test -- node-cache event-bus`

```bash
git add src/shared src/bootstrap tests/unit
git commit -m "feat: add cache provider and internal event bus"
```

### Task 4: Department module with protected deletion

**Files:**
- Create: `src/modules/departments/department.{model,types,validation,repository,service,controller,routes}.ts`
- Create: `src/modules/departments/index.ts`
- Modify: `src/bootstrap/register-modules.ts`, `src/app/routes.ts`
- Test: `tests/unit/department.service.test.ts`, `tests/api/departments.test.ts`

**Interfaces:**
- Consumes: `CacheProvider`, `withTransaction`
- Produces: `DepartmentService.create/list/get/update/remove/restore`
- Consumes callback: `countUsersByDepartment(departmentId: string): Promise<number>`

- [ ] **Step 1: Write failing deletion rule test**

```ts
it('rejects deleting a department assigned to users', async () => {
  const service = makeDepartmentService({ countUsersByDepartment: async () => 2 });
  await expect(service.remove(departmentId)).rejects.toMatchObject({
    status: 409,
    code: 'DEPARTMENT_IN_USE',
  });
});
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- department.service`

Expected: FAIL because DepartmentService is missing.

- [ ] **Step 3: Implement CRUD and validation**

`update(id, { name })` runs inside a transaction, calls the registered user snapshot updater, invalidates `departments:` cache after commit, and publishes `department.renamed`.

- [ ] **Step 4: Test service and HTTP API**

Run: `npm test -- department && npm run typecheck`

Expected: create/list/get/update/remove/restore PASS; in-use deletion returns 409.

- [ ] **Step 5: Commit**

```bash
git add src/modules/departments src/bootstrap src/app tests
git commit -m "feat: add department management module"
```

### Task 5: Role module and permission catalog

**Files:**
- Create: `src/modules/roles/permission.ts`
- Create: `src/modules/roles/role.{model,types,validation,repository,service,controller,routes}.ts`
- Create: `src/modules/roles/index.ts`
- Modify: `src/bootstrap/register-modules.ts`, `src/app/routes.ts`
- Test: `tests/unit/role.service.test.ts`, `tests/api/roles.test.ts`

**Interfaces:**
- Produces: union type `Permission`
- Produces: `RoleService.create/list/get/update/remove/restore`
- Consumes callback: `countUsersByRole(roleId: string): Promise<number>`

- [ ] **Step 1: Write failing role constraint test**

```ts
it('rejects an unknown permission', async () => {
  const parsed = createRoleSchema.safeParse({ name: 'operator', permissions: ['root:anything'] });
  expect(parsed.success).toBe(false);
});
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- role.service`

Expected: FAIL because schema and service are missing.

- [ ] **Step 3: Implement permission catalog and CRUD**

The permission union includes user CRUD, role management, department management, exports creation and audit reading. Role deletion uses `ROLE_IN_USE`; rename synchronizes user snapshots transactionally.

- [ ] **Step 4: Run tests and commit**

Run: `npm run typecheck && npm test -- role`

```bash
git add src/modules/roles src/bootstrap src/app tests
git commit -m "feat: add roles and permission catalog"
```

### Task 6: User module and denormalized snapshots

**Files:**
- Create: `src/modules/users/phone.ts`
- Create: `src/modules/users/user.{model,types,validation,repository,service,controller,routes}.ts`
- Create: `src/modules/users/index.ts`
- Modify: `src/bootstrap/register-modules.ts`, `src/app/routes.ts`
- Test: `tests/unit/user.service.test.ts`, `tests/integration/user-snapshots.test.ts`, `tests/api/users.test.ts`

**Interfaces:**
- Produces: `UserService.create/list/get/update/remove/restore/setStatus`
- Produces: `UserRepository.updateDepartmentSnapshot(id, name, session)`
- Produces: `UserRepository.updateRoleSnapshot(id, name, session)`
- Produces: `normalizeIranianPhone(input: string): string`

- [ ] **Step 1: Write failing normalization and snapshot tests**

```ts
expect(normalizeIranianPhone('+989121234567')).toBe('09121234567');
expect(normalizeIranianPhone('00989121234567')).toBe('09121234567');
```

Integration assertion after department rename:

```ts
expect(await users.findById(user.id)).toMatchObject({
  departmentId: department.id,
  departmentName: 'Engineering',
});
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- user.service user-snapshots`

Expected: FAIL because user module is missing.

- [ ] **Step 3: Implement user CRUD**

Create/update must load active Role and Department and copy both names. List supports `page`, `limit <= 100`, `q`, `roleId`, `departmentId`, `status`, `sortBy`, and `sortDirection` with a whitelist.

- [ ] **Step 4: Wire snapshot callbacks into Role and Department services**

Composition Root injects user count and bulk snapshot functions; Role and Department modules never import the User model.

- [ ] **Step 5: Run tests and commit**

Run: `npm run typecheck && npm test -- user department role`

```bash
git add src/modules src/bootstrap src/app tests
git commit -m "feat: add users and transactional name snapshots"
```

### Task 7: SMS module and OTP persistence

**Files:**
- Create: `src/modules/sms/sms.types.ts`, `sms.service.ts`, `console.provider.ts`, `index.ts`
- Create: `src/modules/auth/otp.model.ts`, `auth.repository.ts`, `auth.validation.ts`
- Modify: `src/bootstrap/register-modules.ts`
- Test: `tests/unit/sms.service.test.ts`, `tests/unit/otp.repository.test.ts`

**Interfaces:**
- Produces: `SmsProvider.sendOtp(phone: string, code: string): Promise<{ messageId: string }>`
- Produces: `AuthRepository.saveOtp`, `consumeOtpAttempt`, `deleteOtp`

- [ ] **Step 1: Write failing SMS delegation test**

```ts
it('delegates OTP delivery without exposing provider details', async () => {
  const provider = { sendOtp: vi.fn().mockResolvedValue({ messageId: 'dev-1' }) };
  await new SmsService(provider).sendOtp('09121234567', '123456');
  expect(provider.sendOtp).toHaveBeenCalledWith('09121234567', '123456');
});
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- sms otp.repository`

Expected: FAIL because SMS and OTP repository are missing.

- [ ] **Step 3: Implement provider boundary and hashed OTP storage**

Store `codeHash`, `expiresAt`, `attempts`, `lastSentAt`; create TTL index on `expiresAt`. Console provider logs only masked phone and message ID, not the OTP in production.

- [ ] **Step 4: Run tests and commit**

Run: `npm run typecheck && npm test -- sms otp.repository`

```bash
git add src/modules/sms src/modules/auth src/bootstrap tests
git commit -m "feat: add sms boundary and secure otp storage"
```

### Task 8: OTP authentication, refresh rotation and RBAC

**Files:**
- Create: `src/modules/auth/session.model.ts`, `token.service.ts`, `auth.service.ts`, `auth.controller.ts`, `auth.routes.ts`, `index.ts`
- Create: `src/shared/http/authenticate.ts`, `src/shared/http/authorize.ts`
- Modify: module routes to attach permission middleware
- Test: `tests/unit/auth.service.test.ts`, `tests/api/auth.test.ts`, `tests/api/permissions.test.ts`

**Interfaces:**
- Produces: `AuthService.requestOtp`, `verifyOtp`, `refresh`, `logout`
- Produces: `authenticate(authService): RequestHandler`
- Produces: `authorize(...permissions: Permission[]): RequestHandler`

- [ ] **Step 1: Write failing auth behavior tests**

```ts
it('locks an OTP after five invalid attempts', async () => {
  for (let i = 0; i < 5; i++) await expect(auth.verifyOtp(phone, '000000')).rejects.toBeDefined();
  await expect(auth.verifyOtp(phone, validCode)).rejects.toMatchObject({ code: 'OTP_LOCKED' });
});
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- auth permissions`

Expected: FAIL because authentication flow is missing.

- [ ] **Step 3: Implement secure token lifecycle**

Access JWT includes `sub`, `sid` and 15-minute expiry. Refresh token is random, stored as SHA-256 hash, rotated on every refresh and revoked on reuse or logout. OTP expires in 2 minutes with 60-second resend cooldown.

- [ ] **Step 4: Add middleware to management routes**

Every route declares permission explicitly, e.g. `authorize('users:read')`; inactive/deleted users receive 401 even with a valid JWT.

- [ ] **Step 5: Run tests and commit**

Run: `npm run typecheck && npm test -- auth permissions`

```bash
git add src/modules src/shared/http src/app tests
git commit -m "feat: add otp authentication and permission guards"
```

### Task 9: PDF and Excel export module

**Files:**
- Create: `src/modules/exports/export.types.ts`, `pdf.service.ts`, `excel.service.ts`, `export.controller.ts`, `export.routes.ts`, `index.ts`
- Modify: `src/bootstrap/register-modules.ts`, `src/app/routes.ts`
- Test: `tests/unit/pdf.service.test.ts`, `tests/unit/excel.service.test.ts`, `tests/api/exports.test.ts`

**Interfaces:**
- Produces: `PdfExportService.render(input: PdfInput): Promise<Readable>`
- Produces: `ExcelExportService.users(query: UserListQuery): Promise<Readable>`

- [ ] **Step 1: Write failing PDF timeout and Excel header tests**

```ts
await expect(pdf.render({ html: '<h1>x</h1>', timeoutMs: 1 }))
  .rejects.toMatchObject({ code: 'PDF_TIMEOUT' });

expect(await readFirstExcelRow(stream)).toEqual([
  'Phone', 'First name', 'Last name', 'Role', 'Department', 'Status',
]);
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- pdf.service excel.service`

Expected: FAIL because export services are missing.

- [ ] **Step 3: Implement safe streaming exports**

Puppeteer connects to `BROWSER_WS_ENDPOINT`, blocks remote network requests, enforces timeout and closes pages in `finally`. ExcelJS streaming writer pulls users in batches of 500 and never materializes the full collection.

- [ ] **Step 4: Add protected download endpoints**

Set exact MIME type and `Content-Disposition`; require `exports:create`; translate browser unavailability to `503 EXPORT_SERVICE_UNAVAILABLE`.

- [ ] **Step 5: Run tests and commit**

Run: `npm run typecheck && npm test -- export pdf excel`

```bash
git add src/modules/exports src/bootstrap src/app tests
git commit -m "feat: add streaming pdf and excel exports"
```

### Task 10: Audit logging and security middleware

**Files:**
- Create: `src/modules/audit-logs/audit-log.model.ts`, `audit-log.repository.ts`, `audit-log.service.ts`, `audit-log.routes.ts`, `index.ts`
- Modify: controllers to record successful mutations
- Modify: `src/app/middleware.ts`
- Test: `tests/integration/audit-log.test.ts`, `tests/api/security.test.ts`

**Interfaces:**
- Produces: `AuditLogService.record({ actorId, action, resource, resourceId, changes, requestId })`
- Produces: read-only paginated audit endpoint guarded by `audit-logs:read`

- [ ] **Step 1: Write failing sensitive-data test**

```ts
it('removes otp and token values from recorded changes', async () => {
  await audit.record({ ...input, changes: { otp: '123456', accessToken: 'secret', status: 'active' } });
  expect(await latestAudit()).toMatchObject({ changes: { status: 'active' } });
});
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- audit-log security`

Expected: FAIL because audit module is missing.

- [ ] **Step 3: Implement audit module and middleware stack**

Install Helmet, configured CORS, JSON size limits, global rate limit and stricter OTP rate limits. Redact `authorization`, cookies, OTP fields and token fields from logs and audit snapshots.

- [ ] **Step 4: Run tests and commit**

Run: `npm run typecheck && npm test -- audit security`

```bash
git add src/modules src/app tests
git commit -m "feat: add audit trail and security middleware"
```

### Task 11: Health checks and graceful shutdown

**Files:**
- Create: `src/modules/health/health.controller.ts`, `health.routes.ts`, `index.ts`
- Create: `src/bootstrap/start-server.ts`, `src/bootstrap/graceful-shutdown.ts`
- Modify: `src/main.ts`, `src/bootstrap/container.ts`
- Test: `tests/unit/graceful-shutdown.test.ts`, `tests/api/health.test.ts`

**Interfaces:**
- Produces: `createShutdownManager(resources: Closeable[], timeoutMs: number)`
- Produces: `/health/live` and `/health/ready`

- [ ] **Step 1: Write failing close-order test**

```ts
it('stops readiness before closing resources exactly once', async () => {
  await Promise.all([shutdown('SIGTERM'), shutdown('SIGINT')]);
  expect(calls).toEqual(['not-ready', 'http', 'browser', 'cache', 'mongo']);
});
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- graceful-shutdown health`

Expected: FAIL because shutdown manager is missing.

- [ ] **Step 3: Implement idempotent shutdown**

Stop readiness first, call `server.close()`, await in-flight requests, then close browser, cache and MongoDB. A 10-second timer forces exit code 1; normal completion returns exit code 0. Register SIGINT, SIGTERM, uncaughtException and unhandledRejection once in `main.ts`.

- [ ] **Step 4: Run tests and commit**

Run: `npm run typecheck && npm test -- graceful-shutdown health`

```bash
git add src/modules/health src/bootstrap src/main.ts tests
git commit -m "feat: add health probes and graceful shutdown"
```

### Task 12: Docker, API documentation, seed and final verification

**Files:**
- Create: `Dockerfile`, `compose.yaml`, `docker/mongo-init.js`
- Create: `src/config/openapi.ts`, `src/scripts/seed.ts`
- Create: `README.md`
- Modify: `package.json`, `.env.example`, `src/app/create-app.ts`
- Test: `tests/api/openapi.test.ts`, `tests/integration/seed.test.ts`

**Interfaces:**
- Produces: repeatable `npm run seed`
- Produces: OpenAPI JSON at `/docs/openapi.json` and UI at `/docs`

- [ ] **Step 1: Write failing documentation and seed tests**

```ts
expect(openapi.paths['/api/v1/users']).toBeDefined();
await seed();
await seed();
expect(await roles.countByName('admin')).toBe(1);
```

- [ ] **Step 2: Verify failure**

Run: `npm test -- openapi seed`

Expected: FAIL because OpenAPI and seed are missing.

- [ ] **Step 3: Implement deployment assets**

Compose starts MongoDB as a single-node Replica Set, initializes it idempotently, starts Chrome Headless and the API, and defines health checks. Seed creates admin Role, initial Department and admin User from validated environment variables without printing secrets.

- [ ] **Step 4: Document exact commands**

README covers prerequisites, environment, `docker compose up --build`, local development, tests, seed, API docs, module conventions, adding an SMS provider and replacing node-cache with Redis.

- [ ] **Step 5: Run complete verification**

Run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
docker compose config
```

Expected: every command exits 0.

- [ ] **Step 6: Commit**

```bash
git add Dockerfile compose.yaml docker src/config src/scripts README.md package.json .env.example tests
git commit -m "docs: complete runnable modular monolith project"
```

## Final Acceptance

- [ ] Start the stack with `docker compose up --build`.
- [ ] Seed initial data with `docker compose exec api npm run seed`.
- [ ] Request OTP using the development SMS provider and authenticate.
- [ ] Exercise User, Role and Department CRUD through Swagger.
- [ ] Verify 409 when deleting an assigned Role or Department.
- [ ] Rename Role and Department and verify user snapshots changed.
- [ ] Download user PDF and Excel exports.
- [ ] Send SIGTERM to the API and verify clean resource shutdown.
- [ ] Run lint, typecheck, unit, integration and API tests one final time.
