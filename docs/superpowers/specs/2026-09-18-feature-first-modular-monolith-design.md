# مشخصات طراحی پروژه Feature-first Layered Modular Monolith

## 1. هدف پروژه

ساخت یک API مدیریتی قابل توسعه با TypeScript، Express و MongoDB که معماری آن Feature-first Layered Modular Monolith باشد. هر قابلیت کسب‌وکاری در ماژول مستقل خود قرار می‌گیرد، اما پروژه وارد پیچیدگی Clean Architecture نمی‌شود.

پروژه شامل مدیریت کاربران، نقش‌ها، دپارتمان‌ها، احراز هویت با شماره موبایل و پیامک، کش، تولید PDF با Chrome Headless، خروجی Excel، ثبت رویدادهای مدیریتی و خاموش‌شدن کنترل‌شده سرویس است.

## 2. فناوری‌ها

- Node.js و TypeScript در حالت strict
- Express
- MongoDB و Mongoose
- Zod برای اعتبارسنجی ورودی و متغیرهای محیطی
- `node-cache` به‌عنوان پیاده‌سازی اولیه Cache Provider
- JWT برای Access Token و Refresh Token
- Puppeteer برای ارتباط با Chrome Headless
- ExcelJS برای تولید فایل Excel
- Pino برای لاگ ساختاریافته
- Vitest و Supertest برای تست
- Swagger/OpenAPI برای مستندات API
- Docker Compose برای API، MongoDB و Chrome Headless

## 3. سبک معماری

جریان معمول درخواست در هر ماژول:

```text
Route -> Controller -> Service -> Repository -> Mongoose Model
```

- Controller فقط HTTP، ورودی و خروجی را مدیریت می‌کند.
- Service قوانین کسب‌وکار و هماهنگی عملیات را انجام می‌دهد.
- Repository تنها محل دسترسی مستقیم به Mongoose است.
- Model ساختار MongoDB و indexها را تعریف می‌کند.
- ماژول‌ها فقط از API عمومی ماژول دیگر استفاده می‌کنند و به فایل‌های داخلی آن وابسته نمی‌شوند.
- ارتباط‌های جانبی میان ماژول‌ها با Event داخلی انجام می‌شود؛ جریان‌های حیاتی از API صریح سرویس‌ها استفاده می‌کنند.

این پروژه Clean Architecture نیست و برای هر عملیات Entity، Use Case و Port جداگانه تولید نمی‌کند.

## 4. ساختار پروژه

```text
src/
├── app/
│   ├── create-app.ts
│   ├── middleware.ts
│   └── routes.ts
├── bootstrap/
│   ├── create-container.ts
│   ├── register-core.ts
│   ├── register-modules.ts
│   ├── start-server.ts
│   └── graceful-shutdown.ts
├── config/
│   ├── env.ts
│   └── constants.ts
├── modules/
│   ├── auth/
│   ├── sms/
│   ├── users/
│   ├── roles/
│   ├── departments/
│   ├── exports/
│   └── audit-logs/
├── shared/
│   ├── cache/
│   ├── database/
│   ├── errors/
│   ├── events/
│   ├── http/
│   ├── logger/
│   └── types/
└── main.ts
```

ساختار نمونه یک Feature:

```text
modules/departments/
├── department.model.ts
├── department.types.ts
├── department.validation.ts
├── department.repository.ts
├── department.service.ts
├── department.controller.ts
├── department.routes.ts
├── department.events.ts
└── index.ts
```

## 5. Composition Root

Composition Root بین چند فایل تقسیم می‌شود:

- `create-container.ts`: ایجاد container و قراردادهای وابستگی
- `register-core.ts`: ثبت MongoDB، logger، cache و event bus
- `register-modules.ts`: ساخت و اتصال repository، service و controller هر ماژول
- `create-app.ts`: ساخت Express بدون بازکردن پورت
- `start-server.ts`: اتصال زیرساخت‌ها و شروع HTTP server
- `graceful-shutdown.ts`: توقف کنترل‌شده منابع

هیچ Service یا Repository داخل route ساخته نمی‌شود و همه وابستگی‌ها از Composition Root تزریق می‌شوند.

## 6. مدل‌های داده

### User

- `_id`
- `phone`: یکتا و نرمال‌شده
- `firstName`
- `lastName`
- `email`: اختیاری و یکتا در صورت وجود
- `roleId`
- `roleName`: نسخه Denormalized
- `departmentId`
- `departmentName`: نسخه Denormalized
- `status`: `active | inactive`
- `deletedAt`: برای Soft Delete
- `createdAt`, `updatedAt`

### Role

- `_id`
- `name`: یکتا
- `permissions`: آرایه Permissionها
- `status`
- `deletedAt`
- `createdAt`, `updatedAt`

### Department

- `_id`
- `name`: یکتا
- `description`: اختیاری
- `status`
- `deletedAt`
- `createdAt`, `updatedAt`

### OTP و Refresh Session

OTP به شکل hash ذخیره می‌شود و دارای زمان انقضا، تعداد تلاش و محدودیت ارسال مجدد است. Refresh Token خام ذخیره نمی‌شود؛ فقط hash توکن، شناسه کاربر، زمان انقضا و اطلاعات نشست نگهداری می‌شود.

## 7. قوانین Role و Department

- ایجاد، مشاهده، ویرایش و حذف نرم پشتیبانی می‌شود.
- نام‌ها بعد از trim و نرمال‌سازی باید یکتا باشند.
- اگر کاربر فعالی به Role یا Department متصل باشد، حذف با خطای `409 Conflict` متوقف می‌شود.
- تغییر نام ابتدا رکورد اصلی و سپس `roleName` یا `departmentName` کاربران مرتبط را به‌روزرسانی می‌کند.
- عملیات تغییر نام در MongoDB Transaction اجرا می‌شود؛ MongoDB در محیط توسعه نیز به شکل Replica Set اجرا خواهد شد.
- بعد از commit، event مربوط به تغییر نام منتشر و cache مرتبط invalid می‌شود.
- شناسه‌ها مرجع اصلی‌اند و نام‌های Denormalized فقط Snapshot خواندنی هستند.

## 8. مدیریت کاربران

- CRUD کامل همراه با Pagination، Search، Filter و Sort
- بررسی وجود و فعال بودن Role و Department هنگام ایجاد یا ویرایش کاربر
- جلوگیری از ثبت شماره موبایل تکراری
- نرمال‌سازی شماره‌های ایران به قالب ثابت `09xxxxxxxxx`
- Soft Delete و Restore
- فعال و غیرفعال‌کردن کاربر
- جلوگیری از دسترسی کاربر حذف‌شده یا غیرفعال

## 9. Auth و SMS

ورود با شماره موبایل و رمز یک‌بارمصرف انجام می‌شود:

1. کلاینت شماره موبایل را ارسال می‌کند.
2. Auth محدودیت درخواست را بررسی و OTP تصادفی تولید می‌کند.
3. Auth برای ارسال، فقط `SmsService` عمومی ماژول SMS را صدا می‌زند.
4. SMS از یک `SmsProvider` قابل تعویض استفاده می‌کند.
5. در محیط توسعه `ConsoleSmsProvider` فعال است؛ Provider واقعی بدون تغییر Auth قابل اضافه‌شدن است.
6. پس از تأیید OTP، Access Token کوتاه‌عمر و Refresh Token چرخشی صادر می‌شود.
7. logout نشست Refresh را باطل می‌کند.

برای جلوگیری از سوءاستفاده، ارسال و تأیید OTP دارای rate limit، cooldown، حداکثر تلاش و زمان انقضا است.

## 10. Permission و دسترسی

Role فقط یک عنوان نیست و Permissionهای صریح دارد، مانند:

- `users:read`, `users:create`, `users:update`, `users:delete`
- `roles:manage`
- `departments:manage`
- `exports:create`
- `audit-logs:read`

Middleware احراز هویت، کاربر جاری را بارگذاری می‌کند و middleware مجوز، Permission لازم endpoint را بررسی می‌کند.

## 11. کش

ماژول `shared/cache` قرارداد `CacheProvider` را ارائه می‌دهد:

- `get`
- `set`
- `delete`
- `deleteByPrefix`
- `has`
- `close`

پیاده‌سازی اولیه `NodeCacheProvider` است. سرویس‌ها به `node-cache` وابسته نیستند و بعداً می‌توان Redis را در Composition Root جایگزین کرد. فهرست Roleها، Departmentها و Permissionهای کاربر cache می‌شوند. تمام mutationها cache مرتبط را invalid می‌کنند.

## 12. PDF و Excel

ماژول `exports` شامل دو سرویس است:

- `PdfExportService`: ساخت HTML امن، ارسال آن به Chrome Headless و دریافت PDF
- `ExcelExportService`: ساخت workbook و stream کردن فایل Excel

گزارش‌های کوچک مستقیم stream می‌شوند. برای جلوگیری از مصرف بیش از حد حافظه، داده‌ها صفحه‌به‌صفحه خوانده می‌شوند و Excel در حالت streaming ساخته می‌شود. PDF دارای timeout، محدودیت concurrency و بازیابی خطای Chrome است.

در نسخه نخست Job Queue و نگهداری دائمی فایل اضافه نمی‌شود؛ API فایل را تولید و مستقیم دانلود می‌کند. ساختار Export Service طوری طراحی می‌شود که Queue بعداً قابل اضافه‌شدن باشد.

## 13. مدیریت خطا و پاسخ API

خطاهای شناخته‌شده با کلاس‌های Typed مانند Validation، NotFound، Conflict، Unauthorized و Forbidden نمایش داده می‌شوند. Middleware نهایی آن‌ها را به پاسخ یکسان تبدیل می‌کند:

```json
{
  "success": false,
  "error": {
    "code": "DEPARTMENT_IN_USE",
    "message": "Department is assigned to one or more users",
    "requestId": "..."
  }
}
```

جزئیات داخلی و stack trace در production به کلاینت داده نمی‌شود.

## 14. Audit Log و Logging

- هر درخواست دارای Request ID است.
- Pino لاگ‌های JSON تولید می‌کند.
- ایجاد، ویرایش، حذف، restore، ورود و خروج در Audit Log ثبت می‌شوند.
- Audit Log شامل actor، action، resource، resourceId، زمان و snapshot خلاصه تغییرات است.
- OTP، token و اطلاعات حساس هرگز log نمی‌شوند.

## 15. Graceful Shutdown

با دریافت `SIGTERM` یا `SIGINT`:

1. readiness سرویس false می‌شود.
2. دریافت connection جدید متوقف می‌شود.
3. درخواست‌های جاری تا سقف timeout تکمیل می‌شوند.
4. HTTP server بسته می‌شود.
5. Chrome client، cache، event bus و اتصال MongoDB بسته می‌شوند.
6. اگر timeout تمام شود، process با کد خطا خاتمه می‌یابد.

Handler فقط یک بار اجرا می‌شود و خطاهای `uncaughtException` و `unhandledRejection` نیز ثبت و منجر به shutdown کنترل‌شده می‌شوند.

## 16. امنیت و عملیات

- Helmet و CORS تنظیم‌شده
- محدودیت اندازه body
- Rate Limit عمومی و محدودیت جداگانه OTP
- اعتبارسنجی کامل env هنگام startup
- عدم قرار دادن secret در repository
- indexهای MongoDB برای phone، email، roleId و departmentId
- endpointهای `/health/live` و `/health/ready`
- Swagger فقط با تنظیم محیطی در production فعال می‌شود

## 17. تست‌ها

- Unit Test برای قوانین Serviceها
- Integration Test با MongoDB واقعی آزمایشی
- API Test برای endpointها با Supertest
- تست جلوگیری از حذف Role و Department در حال استفاده
- تست همگام‌شدن نام Denormalized
- تست OTP، refresh rotation و Permission
- تست timeout و failure در PDF
- تست Graceful Shutdown در سطح اجزای قابل جداسازی

## 18. محدوده نسخه اول

نسخه اول شامل Auth پیامکی با Provider توسعه، User، Role، Department، Cache، PDF، Excel، Audit Log، Swagger، تست‌ها، Docker و Graceful Shutdown است. اتصال به پنل پیامک واقعی از طریق یک Provider جدا انجام می‌شود و تنها نیازمند مشخصات سرویس‌دهنده خواهد بود.

پنل فرانت‌اند، Redis، Job Queue، ذخیره ابری فایل‌ها و Microservice در محدوده نسخه اول نیستند.

## 19. معیار پذیرش

- پروژه با Docker Compose اجرا شود.
- ساختار ماژول‌ها مستقل و قابل فهم باشد.
- هیچ route به Model ماژول دیگری دسترسی مستقیم نداشته باشد.
- CRUD کاربران، Roleها و Departmentها کار کند.
- حذف Role یا Department متصل به کاربر با خطای 409 متوقف شود.
- تغییر نام Role یا Department در Userها همگام شود.
- ورود OTP و refresh token کار کند.
- PDF و Excel قابل دانلود باشند.
- shutdown منابع را بدون رهاکردن اتصال باز ببندد.
- lint، type-check و تمام تست‌ها موفق باشند.
