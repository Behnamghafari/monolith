import { Schema, model } from 'mongoose';

const otpSchema = new Schema({ phone: { type: String, index: true }, codeHash: String, attempts: { type: Number, default: 0 }, lastSentAt: Date, expiresAt: { type: Date, expires: 0 } }, { timestamps: true });
const sessionSchema = new Schema({ userId: { type: Schema.Types.ObjectId, index: true }, tokenHash: String, expiresAt: { type: Date, expires: 0 }, revokedAt: Date }, { timestamps: true });
export const OtpModel = model('Otp', otpSchema);
export const SessionModel = model('Session', sessionSchema);
