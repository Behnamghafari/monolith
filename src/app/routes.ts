// Router را برای ساخت مجموعه‌ای از مسیرهای Express وارد می‌کنیم.
// نوع Express نیز فقط برای TypeScript وارد می‌شود.
import {
  Router,
  type Express,
} from 'express';

// Wrapper مربوط به مدیریت خودکار خطاهای توابع async را وارد می‌کنیم.
import { asyncHandler } from '../shared/http/async-handler.js';

// تابع عمومی ساخت Routeهای CRUD را وارد می‌کنیم.
import { crudRouter } from '../shared/http/crud-router.js';

// Router مربوط به بررسی سلامت و آمادگی برنامه را وارد می‌کنیم.
import { healthRouter } from '../modules/health/health.routes.js';

// نوع Container را وارد می‌کنیم.
// Container شامل Serviceها و وابستگی‌های ساخته‌شده در Composition Root است.
import type { Container } from '../bootstrap/container.js';

// Middleware مربوط به بررسی Access Token و احراز هویت کاربر را وارد می‌کنیم.
import { authenticate } from '../shared/http/authenticate.js';

// Middleware مربوط به بررسی Permissionهای کاربر را وارد می‌کنیم.
import { authorize } from '../shared/http/authorize.js';

// تابع ثبت تمام Routeهای اصلی پروژه را تعریف و export می‌کنیم.
export function registerRoutes(
    // نمونه اصلی اپلیکیشن Express را دریافت می‌کنیم.
    app: Express,

    // Container شامل Serviceها و وابستگی‌های موردنیاز Routeها است.
    c: Container,
) {
  // یک Router مستقل برای نسخه اول API ایجاد می‌کنیم.
  const api = Router();

  // مسیرهای بررسی سلامت برنامه را زیر آدرس /health ثبت می‌کنیم.
  // مسیر نهایی آن بعداً به‌شکل /api/v1/health خواهد بود.
  api.use('/health', healthRouter());

  // endpoint مربوط به درخواست ارسال رمز یک‌بارمصرف را تعریف می‌کنیم.
  api.post(
      // آدرس درخواست OTP را مشخص می‌کنیم.
      '/auth/request-otp',

      // تابع async مربوط به Route را داخل asyncHandler قرار می‌دهیم.
      asyncHandler(async (req, res) => {
        // شماره موبایل را از بدنه درخواست دریافت می‌کنیم.
        // سپس از Auth Service برای ساخت و ارسال OTP کمک می‌گیریم.
        const data = await c.auth.requestOtp(req.body.phone);

        // نتیجه موفق عملیات را با ساختار یکسان API ارسال می‌کنیم.
        res.json({
          // موفق‌بودن درخواست را مشخص می‌کنیم.
          success: true,

          // اطلاعاتی مانند مدت اعتبار OTP را در data قرار می‌دهیم.
          data,
        });
      }),
  );

  // endpoint مربوط به بررسی رمز یک‌بارمصرف را تعریف می‌کنیم.
  api.post(
      // آدرس تأیید OTP را مشخص می‌کنیم.
      '/auth/verify-otp',

      // خطاهای تابع async به Error Handler مرکزی منتقل خواهند شد.
      asyncHandler(async (req, res) => {
        // شماره موبایل و کد OTP را برای بررسی به Auth Service می‌فرستیم.
        const data = await c.auth.verifyOtp(
            // شماره موبایل ارسال‌شده توسط کاربر.
            req.body.phone,

            // رمز یک‌بارمصرف ارسال‌شده توسط کاربر.
            req.body.code,
        );

        // در صورت موفقیت، Access Token و Refresh Token را برمی‌گردانیم.
        res.json({
          // موفق‌بودن عملیات را مشخص می‌کنیم.
          success: true,

          // Tokenهای تولیدشده داخل این فیلد قرار می‌گیرند.
          data,
        });
      }),
  );

  // endpoint مربوط به دریافت Access Token جدید را تعریف می‌کنیم.
  api.post(
      // آدرس Refresh Token را مشخص می‌کنیم.
      '/auth/refresh',

      // عملیات refresh به‌شکل async انجام می‌شود.
      asyncHandler(async (req, res) => {
        // Refresh Token را از بدنه درخواست گرفته و برای اعتبارسنجی ارسال می‌کنیم.
        const data = await c.auth.refresh(req.body.refreshToken);

        // Access Token و Refresh Token جدید را برمی‌گردانیم.
        res.json({
          // موفق‌بودن عملیات را مشخص می‌کنیم.
          success: true,

          // Tokenهای جدید در این قسمت قرار می‌گیرند.
          data,
        });
      }),
  );

  // endpoint مربوط به خروج کاربر از سیستم را تعریف می‌کنیم.
  api.post(
      // آدرس Logout را مشخص می‌کنیم.
      '/auth/logout',

      // عملیات باطل‌کردن نشست به‌شکل async انجام می‌شود.
      asyncHandler(async (req, res) => {
        // Refresh Token را به Auth Service می‌دهیم تا نشست آن باطل شود.
        await c.auth.logout(req.body.refreshToken);

        // کد 204 یعنی عملیات موفق بوده ولی بدنه‌ای برای پاسخ وجود ندارد.
        res.status(204).end();
      }),
  );

  // Middleware احراز هویت را با Token Service موجود در Container می‌سازیم.
  // این Middleware در مسیرهای محافظت‌شده استفاده خواهد شد.
  const loggedIn = authenticate(c.tokens);

  // Routeهای CRUD مربوط به دپارتمان‌ها را ثبت می‌کنیم.
  api.use(
      // پیشوند مسیرهای Department را مشخص می‌کنیم.
      '/departments',

      // Router عمومی CRUD را با Department Service ایجاد می‌کنیم.
      crudRouter(
          // Service مربوط به دپارتمان‌ها را به Router می‌دهیم.
          // as never در اینجا فقط برای عبور از ناسازگاری TypeScript استفاده شده است.
          c.departments as never,

          // Middlewareهای امنیتی این ماژول را تعیین می‌کنیم.
          [
            // ابتدا باید Access Token معتبر باشد.
            loggedIn,

            // سپس کاربر باید مجوز مدیریت دپارتمان‌ها را داشته باشد.
            authorize('departments:manage'),

            // این as never نیز برای عبور از ناسازگاری Type تابع crudRouter استفاده شده است.
          ] as never,
      ),
  );

  // Routeهای CRUD مربوط به نقش‌ها را ثبت می‌کنیم.
  api.use(
      // پیشوند مسیرهای Role را مشخص می‌کنیم.
      '/roles',

      // Router عمومی CRUD را با Role Service ایجاد می‌کنیم.
      crudRouter(
          // Service مربوط به Roleها را ارسال می‌کنیم.
          c.roles as never,

          // Middlewareهای لازم برای دسترسی به Roleها را مشخص می‌کنیم.
          [
            // کاربر باید وارد سیستم شده باشد.
            loggedIn,

            // کاربر باید Permission مدیریت Roleها را داشته باشد.
            authorize('roles:manage'),
          ] as never,
      ),
  );

  // Routeهای CRUD مربوط به کاربران را ثبت می‌کنیم.
  api.use(
      // پیشوند مسیرهای User را مشخص می‌کنیم.
      '/users',

      // Router عمومی CRUD را با User Service ایجاد می‌کنیم.
      crudRouter(
          // Service مدیریت کاربران را ارسال می‌کنیم.
          c.users as never,

          // Middlewareهای محافظت از مسیرهای کاربران را مشخص می‌کنیم.
          [
            // ابتدا Access Token بررسی می‌شود.
            loggedIn,

            // سپس Permission مشاهده کاربران بررسی می‌شود.
            authorize('users:read'),
          ] as never,
      ),
  );

  // endpoint دریافت فایل Excel کاربران را تعریف می‌کنیم.
  api.get(
      // آدرس دانلود فایل Excel را مشخص می‌کنیم.
      '/exports/users.xlsx',

      // فقط کاربران واردشده اجازه دسترسی دارند.
      loggedIn,

      // کاربر باید Permission ساخت خروجی را داشته باشد.
      authorize('exports:create'),

      // عملیات ساخت و ارسال Excel به‌شکل async مدیریت می‌شود.
      asyncHandler(async (_req, res) => {
        // نوع محتوای پاسخ را برای فایل XLSX مشخص می‌کنیم.
        res.setHeader(
            'content-type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );

        // به مرورگر اعلام می‌کنیم که پاسخ باید به‌عنوان فایل دانلود شود.
        res.setHeader(
            'content-disposition',
            'attachment; filename="users.xlsx"',
        );

        // فایل Excel را به‌صورت Stream تولید می‌کنیم.
        // سپس Stream را مستقیماً به پاسخ HTTP متصل می‌کنیم.
        c.excel.usersExport().pipe(res);
      }),
  );

  // endpoint ساخت و دانلود PDF را تعریف می‌کنیم.
  api.post(
      // آدرس ساخت فایل PDF را مشخص می‌کنیم.
      '/exports/pdf',

      // کاربر باید Access Token معتبر داشته باشد.
      loggedIn,

      // کاربر باید مجوز ساخت خروجی را داشته باشد.
      authorize('exports:create'),

      // عملیات PDF داخل asyncHandler قرار می‌گیرد تا خطاها مدیریت شوند.
      asyncHandler(async (req, res) => {
        // نوع محتوای پاسخ را PDF تعیین می‌کنیم.
        res.setHeader(
            'content-type',
            'application/pdf',
        );

        // به مرورگر اعلام می‌کنیم که پاسخ باید به‌صورت فایل دانلود شود.
        res.setHeader(
            'content-disposition',
            'attachment; filename="report.pdf"',
        );

        // محتوای HTML را از بدنه درخواست دریافت می‌کنیم.
        // سپس آن را با Chrome Headless به PDF تبدیل می‌کنیم.
        const pdfStream = await c.pdf.render(req.body.html);

        // Stream فایل PDF را مستقیماً به پاسخ HTTP متصل می‌کنیم.
        pdfStream.pipe(res);
      }),
  );

  // Router ساخته‌شده را با پیشوند نسخه اول API روی Express ثبت می‌کنیم.
  // برای مثال مسیر /users به /api/v1/users تبدیل خواهد شد.
  app.use('/api/v1', api);
}