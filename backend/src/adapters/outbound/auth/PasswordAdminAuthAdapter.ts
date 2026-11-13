import crypto from 'crypto';
import { AdminAuthOutboundPort } from '../../../domain/ports/outbound/AdminAuthOutboundPort';

const DEFAULT_TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export class PasswordAdminAuthAdapter implements AdminAuthOutboundPort {
  private readonly adminPassword: string;
  private readonly sessionSecret: string;
  private readonly tokenTtlMs: number;

  constructor(
    adminPassword: string = process.env.ADMIN_PASSWORD || 'peasants2026!',
    sessionSecret?: string,
    tokenTtlMs: number = DEFAULT_TOKEN_TTL_MS
  ) {
    this.adminPassword = adminPassword;
    this.sessionSecret =
      sessionSecret ||
      process.env.ADMIN_SESSION_SECRET ||
      `prrc-admin-hmac:${this.adminPassword}`;
    this.tokenTtlMs = tokenTtlMs;
  }

  async verifyAdminPassword(password: string): Promise<boolean> {
    if (typeof password !== 'string') {
      return false;
    }
    const inputBuf = Buffer.from(password, 'utf8');
    const expectedBuf = Buffer.from(this.adminPassword, 'utf8');
    if (inputBuf.length !== expectedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(inputBuf, expectedBuf);
  }

  generateAdminToken(nowMs: number = Date.now()): string {
    const payload = {
      role: 'admin',
      iat: nowMs,
      exp: nowMs + this.tokenTtlMs,
    };
    const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.sessionSecret)
      .update(payloadB64)
      .digest('base64url');
    return `${payloadB64}.${signature}`;
  }

  verifyAdminToken(token: string, nowMs: number = Date.now()): boolean {
    if (typeof token !== 'string' || !token.includes('.')) {
      return false;
    }
    const parts = token.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return false;
    }
    const [payloadB64, sigB64] = parts;
    const expectedSig = crypto
      .createHmac('sha256', this.sessionSecret)
      .update(payloadB64)
      .digest('base64url');

    const sigBuf = Buffer.from(sigB64, 'utf8');
    const expectedBuf = Buffer.from(expectedSig, 'utf8');
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      return false;
    }

    try {
      const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      if (!decoded || decoded.role !== 'admin' || typeof decoded.exp !== 'number') {
        return false;
      }
      return nowMs <= decoded.exp;
    } catch {
      return false;
    }
  }
}
