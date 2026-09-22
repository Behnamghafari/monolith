// ماژول داخلی HTTP نود را برای ساخت سرور HTTP وارد می‌کنیم.
import http from 'node:http';

// کتابخانه Mongoose را برای اتصال و کار با MongoDB وارد می‌کنیم.
import mongoose from 'mongoose';

// تابع ساخت اپلیکیشن Express را وارد می‌کنیم.
import { createApp } from './app/create-app.js';

// تابع ثبت‌کردن Routeهای پروژه را وارد می‌کنیم.
import { registerRoutes } from './app/routes.js';

// تابع ساخت Composition Root و اتصال وابستگی‌ها را وارد می‌کنیم.
import { createContainer } from './bootstrap/container.js';

// تابع مدیریت خاموش‌شدن کنترل‌شده برنامه را وارد می‌کنیم.
import { createShutdownManager } from './bootstrap/graceful-shutdown.js';

// تابع خواندن و اعتبارسنجی متغیرهای محیطی را وارد می‌کنیم.
import { parseEnv } from './config/env.js';

// متغیرهای محیطی برنامه را خوانده و اعتبارسنجی می‌کنیم.
// اگر مقدار ضروری نامعتبر باشد، اجرای برنامه همین‌جا متوقف می‌شود.
const env = parseEnv(process.env);

// با استفاده از آدرس موجود در تنظیمات، اتصال به MongoDB را برقرار می‌کنیم.
// به دلیل استفاده از top-level await، ادامه اجرای فایل تا اتصال موفق منتظر می‌ماند.
await mongoose.connect(env.MONGODB_URI);

// Composition Root پروژه را ایجاد می‌کنیم.
// تمام Serviceها، Repositoryها، Cache و وابستگی‌های ماژول‌ها اینجا ساخته و متصل می‌شوند.
const container = createContainer(env);

// اپلیکیشن Express را ایجاد می‌کنیم.
// تابع ثبت Routeها به createApp داده می‌شود تا مسیرها با وابستگی‌های داخل Container ساخته شوند.
const app = createApp({
  // نمونه Express را دریافت کرده و تمام Routeهای پروژه را روی آن ثبت می‌کنیم.
  registerRoutes: (instance) => registerRoutes(instance, container),
});

// اپلیکیشن Express را داخل یک سرور HTTP استاندارد نود قرار می‌دهیم.
const server = http.createServer(app);

// سرور را روی پورت مشخص‌شده در متغیرهای محیطی اجرا می‌کنیم.
server.listen(
  // شماره پورتی که سرور باید روی آن گوش دهد.
  env.PORT,

  // این callback بعد از شروع موفق سرور اجرا می‌شود.
  () => console.info(`API listening on :${env.PORT}`),
);

// مدیر Graceful Shutdown را ایجاد می‌کنیم.
// منابع به ترتیب تعریف‌شده بسته خواهند شد.
const shutdown = createShutdownManager(
  [
    {
      // نام این منبع برای تشخیص آن هنگام خاموش‌شدن برنامه است.
      name: 'http',

      // دریافت اتصال‌های جدید را متوقف می‌کنیم و منتظر پایان درخواست‌های جاری می‌مانیم.
      close: () =>
        new Promise<void>((resolve, reject) =>
          server.close((error) =>
            // اگر بستن سرور خطا داشت، Promise را reject می‌کنیم.
            error
              ? reject(error)
              // اگر سرور با موفقیت بسته شد، Promise را resolve می‌کنیم.
              : resolve(),
          ),
        ),
    },
    {
      // منبع دوم، سیستم Cache برنامه است.
      name: 'cache',

      // Cache را می‌بندیم و منابع یا Timerهای داخلی آن را آزاد می‌کنیم.
      close: () => container.cache.close(),
    },
    {
      // منبع سوم، اتصال MongoDB است.
      name: 'mongo',

      // ارتباط Mongoose با MongoDB را به‌شکل کنترل‌شده قطع می‌کنیم.
      close: () => mongoose.disconnect(),
    },
  ],

  // حداکثر زمان مجاز برای خاموش‌شدن کامل برنامه، ۱۰ هزار میلی‌ثانیه است.
  10_000,
);

// سیگنال‌هایی را مشخص می‌کنیم که باید Graceful Shutdown را آغاز کنند.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  // برای هر سیگنال فقط یک listener یک‌بارمصرف ثبت می‌کنیم.
  process.once(
    // سیگنال سیستم‌عامل مانند Ctrl+C یا دستور توقف Container.
    signal,

    // با دریافت سیگنال، فرایند خاموش‌شدن کنترل‌شده را آغاز می‌کنیم.
    // void نشان می‌دهد Promise عمداً در این callback await نمی‌شود.
    () => void shutdown(signal),
  );
}

// خطاهای همگامی را که در هیچ بخش برنامه مدیریت نشده‌اند دریافت می‌کنیم.
process.once('uncaughtException', (error) => {
  // خطا را برای بررسی و عیب‌یابی ثبت می‌کنیم.
  console.error(error);

  // سپس Graceful Shutdown را به‌جای خروج ناگهانی اجرا می‌کنیم.
  void shutdown('uncaughtException');
});

// Promiseهای reject‌شده‌ای را که catch نشده‌اند دریافت می‌کنیم.
process.once('unhandledRejection', (error) => {
  // دلیل ردشدن Promise را ثبت می‌کنیم.
  console.error(error);

  // سپس منابع برنامه را به‌شکل کنترل‌شده می‌بندیم.
  void shutdown('unhandledRejection');
});