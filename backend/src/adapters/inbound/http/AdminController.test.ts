import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { AdminController } from './AdminController';
import { AdminAuthOutboundPort } from '../../../domain/ports/outbound/AdminAuthOutboundPort';

describe('AdminController', () => {
  let mockAuthAdapter: AdminAuthOutboundPort;
  let controller: AdminController;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockAuthAdapter = {
      verifyAdminPassword: vi.fn(),
    };
    controller = new AdminController(mockAuthAdapter);
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
  });

  it('returns 200 with admin_session_valid when password is valid', async () => {
    (mockAuthAdapter.verifyAdminPassword as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    const mockReq = { body: { password: 'valid-password' } } as Request;

    await controller.login(mockReq, mockRes as Response);

    expect(mockAuthAdapter.verifyAdminPassword).toHaveBeenCalledWith('valid-password');
    expect(mockRes.json).toHaveBeenCalledWith({ success: true, token: 'admin_session_valid' });
  });

  it('returns 401 when password is invalid', async () => {
    (mockAuthAdapter.verifyAdminPassword as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    const mockReq = { body: { password: 'wrong' } } as Request;

    await controller.login(mockReq, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ success: false, error: 'Incorrect admin password' });
  });

  it('returns 500 when verifyAdminPassword throws an error', async () => {
    (mockAuthAdapter.verifyAdminPassword as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Auth failed'));
    const mockReq = { body: { password: 'pass' } } as Request;

    await controller.login(mockReq, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Auth failed' });
  });
});
