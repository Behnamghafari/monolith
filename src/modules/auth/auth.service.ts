import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { AppError } from '../../shared/errors/app-error.js';
import type { SmsService } from '../sms/sms.service.js';
import { normalizeIranianPhone } from '../users/phone.js';
import type { UserRepository } from '../users/user.repository.js';
import type { RoleService } from '../roles/role.service.js';
import { OtpModel, SessionModel } from './auth.model.js';
import type { TokenService } from './token.service.js';

export class AuthService {
  constructor(private sms: SmsService, private users: UserRepository, private roles: RoleService, private tokens: TokenService) {}
  async requestOtp(rawPhone: string) {
    const phone = normalizeIranianPhone(rawPhone);
    const previous = await OtpModel.findOne({ phone }).lean();
    if (previous?.lastSentAt && Date.now() - previous.lastSentAt.getTime() < 60_000) throw new AppError(429, 'OTP_COOLDOWN', 'Wait before requesting another code');
    const code = crypto.randomInt(100000, 1000000).toString();
    await OtpModel.findOneAndUpdate({ phone }, { codeHash: await bcrypt.hash(code, 10), attempts: 0, lastSentAt: new Date(), expiresAt: new Date(Date.now() + 120_000) }, { upsert: true });
    await this.sms.sendOtp(phone, code);
    return { expiresIn: 120 };
  }
  async verifyOtp(rawPhone: string, code: string) {
    const phone = normalizeIranianPhone(rawPhone); const otp = await OtpModel.findOne({ phone });
    if (!otp || !otp.expiresAt || otp.expiresAt.getTime() < Date.now()) throw new AppError(401, 'OTP_EXPIRED', 'OTP expired');
    if ((otp.attempts ?? 0) >= 5) throw new AppError(429, 'OTP_LOCKED', 'OTP locked');
    if (!otp.codeHash || !await bcrypt.compare(code, otp.codeHash)) { otp.attempts = (otp.attempts ?? 0) + 1; await otp.save(); throw new AppError(401, 'OTP_INVALID', 'Invalid OTP'); }
    const user = await this.users.findByPhone(phone); if (!user || user.status !== 'active') throw new AppError(401, 'USER_UNAVAILABLE', 'User is unavailable');
    const session = await SessionModel.create({ userId: user._id, tokenHash: 'pending', expiresAt: new Date(Date.now() + 30 * 86400000) });
    const refreshToken = this.tokens.refresh(String(user._id), String(session._id)); session.tokenHash = this.tokens.hash(refreshToken); await session.save(); await otp.deleteOne();
    const role = await this.roles.get(String(user.roleId));
    return { accessToken: this.tokens.access(String(user._id), String(session._id), [...role.permissions]), refreshToken };
  }
  async refresh(refreshToken: string) {
    const payload = this.tokens.verifyRefresh(refreshToken); const session = await SessionModel.findById(payload.sid);
    if (!session || session.revokedAt || session.tokenHash !== this.tokens.hash(refreshToken)) throw new AppError(401, 'REFRESH_INVALID', 'Invalid refresh token');
    const next = this.tokens.refresh(String(payload.sub), String(session._id)); session.tokenHash = this.tokens.hash(next); await session.save();
    const user = await this.users.findById(String(payload.sub)); if (!user) throw new AppError(401, 'USER_UNAVAILABLE', 'User unavailable');
    const role = await this.roles.get(String(user.roleId));
    return { accessToken: this.tokens.access(String(payload.sub), String(session._id), [...role.permissions]), refreshToken: next };
  }
  async logout(refreshToken: string) { try { const payload = this.tokens.verifyRefresh(refreshToken); await SessionModel.findByIdAndUpdate(payload.sid, { revokedAt: new Date() }); } catch { /* idempotent */ } }
}
