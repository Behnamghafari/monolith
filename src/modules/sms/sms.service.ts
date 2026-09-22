import type { SmsProvider } from './sms.types.js';

export class SmsService {
  constructor(private readonly provider: SmsProvider) {}
  sendOtp(phone: string, code: string) { return this.provider.sendOtp(phone, code); }
}
