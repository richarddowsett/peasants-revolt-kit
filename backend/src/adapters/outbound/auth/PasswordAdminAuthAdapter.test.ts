import { describe, it, expect } from 'vitest';
import { PasswordAdminAuthAdapter } from './PasswordAdminAuthAdapter';

describe('PasswordAdminAuthAdapter', () => {
  it('verifies correct password using default password', async () => {
    const adapter = new PasswordAdminAuthAdapter('secret123');
    expect(await adapter.verifyAdminPassword('secret123')).toBe(true);
    expect(await adapter.verifyAdminPassword('wrong')).toBe(false);
  });

  it('uses environment variable or fallback when no argument passed', async () => {
    const adapter = new PasswordAdminAuthAdapter();
    expect(await adapter.verifyAdminPassword('peasants2026!')).toBe(true);
  });
});
