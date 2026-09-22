// نوع AppEnv را از ماژول تنظیمات وارد می‌کنیم.
// این Type ساختار متغیرهای محیطی اعتبارسنجی‌شده پروژه را مشخص می‌کند.
import type { AppEnv } from '../config/env.js';

// تابع ثبت وابستگی‌های عمومی و زیرساختی پروژه را وارد می‌کنیم.
// این بخش شامل موارد مشترکی مانند Cache و Transaction Runner است.
import { registerCore } from './register-core.js';

// تابع ساخت و اتصال ماژول‌های اصلی برنامه را وارد می‌کنیم.
// این تابع Serviceها، Repositoryها و وابستگی‌های Featureها را ایجاد می‌کند.
import { registerModules } from './register-modules.js';

// تابع اصلی Composition Root پروژه را تعریف و export می‌کنیم.
// مسئولیت این تابع ساخت تمام وابستگی‌ها و قراردادن آن‌ها داخل Container است.
export function createContainer(
    // تنظیمات اعتبارسنجی‌شده برنامه را دریافت می‌کنیم.
    // ماژول‌هایی مانند Auth و PDF برای ساخته‌شدن به این تنظیمات نیاز دارند.
    env: AppEnv,
) {
  // ابتدا وابستگی‌های عمومی و زیرساختی برنامه را ایجاد می‌کنیم.
  // خروجی شامل Cache Provider و Transaction Runner است.
  const core = registerCore();

  // تمام وابستگی‌های ساخته‌شده را داخل یک Object برمی‌گردانیم.
  return {
    // وابستگی‌های زیرساختی مانند Cache و Transaction را اضافه می‌کنیم.
    ...core,

    // ماژول‌های برنامه را با استفاده از تنظیمات و وابستگی‌های Core می‌سازیم.
    // سپس خروجی آن‌ها را نیز به Container اضافه می‌کنیم.
    ...registerModules(env, core),
  };
}

// نوع Container را به‌صورت خودکار از خروجی createContainer استخراج می‌کنیم.
// با این روش، بعد از اضافه یا حذف وابستگی‌ها نیازی به تغییر دستی Type وجود ندارد.
export type Container = ReturnType<typeof createContainer>;