export interface SmsProvider {
  sendOtp(phone: string, code: string): Promise<{ messageId: string }>;
}
