import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

export class TokenService {
  constructor(private accessSecret: string, private refreshSecret: string) {}
  access(userId: string, sessionId: string, permissions: string[]) { return jwt.sign({ sub: userId, sid: sessionId, permissions }, this.accessSecret, { expiresIn: '15m' }); }
  refresh(userId: string, sessionId: string) { return jwt.sign({ sub: userId, sid: sessionId, nonce: crypto.randomUUID() }, this.refreshSecret, { expiresIn: '30d' }); }
  verifyAccess(token: string) { return jwt.verify(token, this.accessSecret) as jwt.JwtPayload; }
  verifyRefresh(token: string) { return jwt.verify(token, this.refreshSecret) as jwt.JwtPayload; }
  hash(token: string) { return crypto.createHash('sha256').update(token).digest('hex'); }
}
