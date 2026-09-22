import type { SmsProvider } from './sms.types.js';

export class ConsoleSmsProvider implements SmsProvider {
  async sendOtp(phone: string, code: string) {
    if (process.env.NODE_ENV !== 'production') console.info(`[dev-sms] ${phone.slice(0, 4)}***${phone.slice(-2)} OTP=${code}`);
    return { messageId: `dev-${Date.now()}` };
  }
}
