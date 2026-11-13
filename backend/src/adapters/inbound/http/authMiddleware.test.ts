import { describe, it, expect, vi } from 'vitest';
import { Request, Response } from 'express';
import {
  extractBearerToken,
  isValidAdminRequest,
  createRequireAdminAuth,
} from './authMiddleware';
import { PasswordAdminAuthAdapter } from '../../outbound/auth/PasswordAdminAuthAdapter';

describe('authMiddleware', () => {
  const authAdapter = new PasswordAdminAuthAdapter('admin-pass', 'secret-key', 60_000);

  it('extractBearerToken extracts Bearer token case-insensitively', () => {
    expect(
      extractBearerToken({ headers: { authorization: 'Bearer my-token-123' } } as unknown as Request)
    ).toBe('my-token-123');
    expect(
      extractBearerToken({ headers: { Authorization: 'bearer   abc.def  ' } } as unknown as Request)
    ).toBe('abc.def');
    expect(extractBearerToken({ headers: {} } as unknown as Request)).toBeNull();
    expect(
      extractBearerToken({ headers: { authorization: 'Basic 1234' } } as unknown as Request)
    ).toBeNull();
  });

  it('isValidAdminRequest returns true only for valid signed admin token', () => {
    const validToken = authAdapter.generateAdminToken();
    const validReq = {
      headers: { authorization: `Bearer ${validToken}` },
    } as unknown as Request;
    const invalidReq = {
      headers: { authorization: 'Bearer invalid.token' },
    } as unknown as Request;

    expect(isValidAdminRequest(validReq, authAdapter)).toBe(true);
    expect(isValidAdminRequest(invalidReq, authAdapter)).toBe(false);
    expect(isValidAdminRequest({ headers: {} } as unknown as Request, authAdapter)).toBe(false);
  });

  it('createRequireAdminAuth calls next() on valid token and returns 401 otherwise', () => {
    const middleware = createRequireAdminAuth(authAdapter);
    const next = vi.fn();
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;

    middleware({ headers: {} } as unknown as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();

    const validToken = authAdapter.generateAdminToken();
    middleware(
      { headers: { authorization: `Bearer ${validToken}` } } as unknown as Request,
      res,
      next
    );
    expect(next).toHaveBeenCalledTimes(1);
  });
});
