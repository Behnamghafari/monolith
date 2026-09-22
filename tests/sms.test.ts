import { describe, expect, it, vi } from 'vitest';
import { SmsService } from '../src/modules/sms/sms.service.js';

describe('SmsService', () => {
  it('delegates OTP delivery', async () => {
    const provider = { sendOtp: vi.fn().mockResolvedValue({ messageId: 'dev-1' }) };
    await new SmsService(provider).sendOtp('09121234567', '123456');
    expect(provider.sendOtp).toHaveBeenCalledWith('09121234567', '123456');
  });
});
