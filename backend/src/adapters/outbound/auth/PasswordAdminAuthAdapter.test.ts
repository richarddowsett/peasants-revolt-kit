import { describe, it, expect } from 'vitest';
import { PasswordAdminAuthAdapter } from './PasswordAdminAuthAdapter';

describe('PasswordAdminAuthAdapter', () => {
  it('verifies correct password using constant-time comparison', async () => {
    const adapter = new PasswordAdminAuthAdapter('secret123');
    expect(await adapter.verifyAdminPassword('secret123')).toBe(true);
    expect(await adapter.verifyAdminPassword('wrong')).toBe(false);
    expect(await adapter.verifyAdminPassword('secret124')).toBe(false);
    expect(await adapter.verifyAdminPassword(undefined as unknown as string)).toBe(false);
  });

  it('uses environment variable or fallback when no argument passed', async () => {
    const adapter = new PasswordAdminAuthAdapter();
    expect(await adapter.verifyAdminPassword('peasants2026!')).toBe(true);
  });

  it('generates and verifies signed HMAC admin tokens with TTL', () => {
    const adapter = new PasswordAdminAuthAdapter('secret123', 'test-hmac-secret', 60_000);
    const now = 1_700_000_000_000;
    const token = adapter.generateAdminToken(now);

    expect(adapter.verifyAdminToken(token, now)).toBe(true);
    expect(adapter.verifyAdminToken(token, now + 30_000)).toBe(true);
    // Expired after 60s
    expect(adapter.verifyAdminToken(token, now + 60_001)).toBe(false);
  });

  it('rejects malformed or tampered tokens', () => {
    const adapter = new PasswordAdminAuthAdapter('secret123', 'test-hmac-secret', 60_000);
    const otherAdapter = new PasswordAdminAuthAdapter('secret123', 'different-secret', 60_000);
    const token = adapter.generateAdminToken();

    expect(adapter.verifyAdminToken('')).toBe(false);
    expect(adapter.verifyAdminToken('not-a-valid-token')).toBe(false);
    expect(adapter.verifyAdminToken('a.b.c')).toBe(false);
    expect(adapter.verifyAdminToken(`${token}tampered`)).toBe(false);
    expect(otherAdapter.verifyAdminToken(token)).toBe(false);
  });
});
