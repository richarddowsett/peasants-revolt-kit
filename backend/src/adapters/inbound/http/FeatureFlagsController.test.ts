import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeatureFlagsController } from './FeatureFlagsController';
import { GetFeatureFlagInboundPort } from '../../../domain/ports/inbound/GetFeatureFlagInboundPort';
import { SetFeatureFlagInboundPort } from '../../../domain/ports/inbound/SetFeatureFlagInboundPort';
import { Request, Response } from 'express';

describe('FeatureFlagsController', () => {
  let getUseCase: GetFeatureFlagInboundPort;
  let setUseCase: SetFeatureFlagInboundPort;
  let controller: FeatureFlagsController;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    getUseCase = {
      getFlag: vi.fn(),
      getAllFlags: vi.fn(),
    };
    setUseCase = {
      execute: vi.fn(),
    };
    controller = new FeatureFlagsController(getUseCase, setUseCase);
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  it('getFlags responds with all feature flags', async () => {
    const flags = [{ id: 'store_closed', name: 'Store Closed', enabled: false, updatedAt: '2026-01-01' }];
    vi.mocked(getUseCase.getAllFlags).mockResolvedValue(flags);

    const req = {} as Request;
    await controller.getFlags(req, mockRes as Response);

    expect(mockRes.json).toHaveBeenCalledWith(flags);
  });

  it('getFlag responds with specific feature flag', async () => {
    const flag = { id: 'store_closed', name: 'Store Closed', enabled: true, updatedAt: '2026-01-01' };
    vi.mocked(getUseCase.getFlag).mockResolvedValue(flag);

    const req = { params: { id: 'store_closed' } } as unknown as Request;
    await controller.getFlag(req, mockRes as Response);

    expect(mockRes.json).toHaveBeenCalledWith(flag);
  });

  it('getFlag responds with 404 if flag not found', async () => {
    vi.mocked(getUseCase.getFlag).mockResolvedValue(null);

    const req = { params: { id: 'nonexistent' } } as unknown as Request;
    await controller.getFlag(req, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith({ error: "Feature flag 'nonexistent' not found" });
  });

  it('setFlag rejects non-boolean enabled property with 400', async () => {
    const req = {
      params: { id: 'store_closed' },
      body: { enabled: 'invalid' },
    } as unknown as Request;

    await controller.setFlag(req, mockRes as Response);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Property "enabled" must be a boolean.' });
  });

  it('setFlag updates and responds with updated flag', async () => {
    const updatedFlag = { id: 'store_closed', name: 'Store Closed', enabled: true, updatedAt: '2026-01-01' };
    vi.mocked(setUseCase.execute).mockResolvedValue(updatedFlag);

    const req = {
      params: { id: 'store_closed' },
      body: { enabled: true, name: 'Store Closed' },
    } as unknown as Request;

    await controller.setFlag(req, mockRes as Response);

    expect(setUseCase.execute).toHaveBeenCalledWith({
      id: 'store_closed',
      enabled: true,
      name: 'Store Closed',
      description: undefined,
    });
    expect(mockRes.json).toHaveBeenCalledWith(updatedFlag);
  });
});
