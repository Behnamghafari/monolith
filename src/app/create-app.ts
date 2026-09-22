// ماژول داخلی Crypto نود را برای تولید شناسه تصادفی و منحصربه‌فرد وارد می‌کنیم.
import crypto from 'node:crypto';

// Middleware مربوط به CORS را وارد می‌کنیم.
// این Middleware دسترسی Frontendها و دامنه‌های دیگر به API را کنترل می‌کند.
import cors from 'cors';

// تابع اصلی Express و نوع Express را وارد می‌کنیم.
// کلمه type باعث می‌شود Express فقط به‌عنوان یک Type وارد شود.
import express, { type Express } from 'express';

// Middleware امنیتی Helmet را وارد می‌کنیم.
// Helmet تعدادی Header امنیتی را به پاسخ‌های HTTP اضافه می‌کند.
import helmet from 'helmet';

// Middleware مدیریت خطای مرکزی و مدیریت مسیرهای پیدانشده را وارد می‌کنیم.
import {
  errorHandler,
  notFound,
} from '../shared/errors/error-handler.js';

// ابزار نمایش مستندات Swagger را وارد می‌کنیم.
import swaggerUi from 'swagger-ui-express';

// تنظیمات و ساختار OpenAPI پروژه را وارد می‌کنیم.
import { openapi } from '../config/openapi.js';

// تابع ساخت اپلیکیشن Express را تعریف و export می‌کنیم.
// این تابع سرور را اجرا نمی‌کند و فقط نمونه Express را می‌سازد.
export function createApp(
    // وابستگی‌های موردنیاز تابع را دریافت می‌کنیم.
    deps: {
      // این تابع مسئول ثبت Routeهای پروژه روی نمونه Express است.
      registerRoutes(app: Express): void;
    },
) {
  // یک نمونه جدید از اپلیکیشن Express ایجاد می‌کنیم.
  const app = express();

  // Header پیش‌فرض X-Powered-By را غیرفعال می‌کنیم.
  // این Header به‌صورت پیش‌فرض مشخص می‌کند برنامه با Express ساخته شده است.
  app.disable('x-powered-by');

  // Headerهای امنیتی پیشنهادی را به پاسخ‌های HTTP اضافه می‌کنیم.
  app.use(helmet());

  // امکان ارسال درخواست از Originهای دیگر را فعال می‌کنیم.
  // در محیط واقعی بهتر است Originهای مجاز به‌صورت دقیق مشخص شوند.
  app.use(cors());

  // بدنه درخواست‌های JSON را پردازش می‌کنیم.
  // حداکثر اندازه بدنه درخواست روی یک مگابایت قرار داده شده است.
  app.use(express.json({ limit: '1mb' }));

  // یک Middleware عمومی برای ایجاد یا دریافت Request ID ثبت می‌کنیم.
  app.use((req, res, next) => {
    // اگر درخواست از قبل x-request-id داشته باشد، همان مقدار را استفاده می‌کنیم.
    // در غیر این صورت یک UUID تصادفی و منحصربه‌فرد تولید می‌کنیم.
    const id =
        req.header('x-request-id') ??
        crypto.randomUUID();

    // Request ID را داخل Headerهای خود درخواست قرار می‌دهیم.
    // Middlewareها و بخش‌های بعدی برنامه می‌توانند از این شناسه استفاده کنند.
    req.headers['x-request-id'] = id;

    // Request ID را در Header پاسخ هم قرار می‌دهیم.
    // کلاینت می‌تواند این شناسه را برای پیگیری خطا یا گزارش مشکل ارسال کند.
    res.setHeader('x-request-id', id);

    // اجرای درخواست را به Middleware یا Route بعدی منتقل می‌کنیم.
    next();
  });

  // تمام Routeهای اصلی پروژه را روی اپلیکیشن Express ثبت می‌کنیم.
  // پیاده‌سازی Routeها از بیرون به این تابع تزریق شده است.
  deps.registerRoutes(app);

  // یک endpoint برای دریافت فایل JSON مربوط به OpenAPI ثبت می‌کنیم.
  app.get(
      // آدرس فایل JSON مستندات API را مشخص می‌کنیم.
      '/docs/openapi.json',

      // ساختار OpenAPI را به‌صورت JSON برای کلاینت ارسال می‌کنیم.
      (_req, res) => res.json(openapi),
  );

  // رابط گرافیکی Swagger را روی مسیر /docs فعال می‌کنیم.
  app.use(
      // آدرس نمایش مستندات Swagger را مشخص می‌کنیم.
      '/docs',

      // فایل‌های موردنیاز رابط Swagger را ارائه می‌کند.
      swaggerUi.serve,

      // رابط Swagger را با تنظیمات OpenAPI پروژه راه‌اندازی می‌کند.
      swaggerUi.setup(openapi),
  );

  // اگر هیچ‌کدام از Routeهای قبلی با درخواست مطابقت نداشتند،
  // Middleware مربوط به Route Not Found اجرا می‌شود.
  app.use(notFound);

  // Middleware مدیریت خطای مرکزی را در آخرین مرحله ثبت می‌کنیم.
  // خطاهای ارسال‌شده با next(error) در این قسمت پردازش می‌شوند.
  app.use(errorHandler);

  // نمونه آماده‌شده Express را برمی‌گردانیم.
  // این نمونه بعداً داخل یک HTTP Server قرار می‌گیرد.
  return app;
}