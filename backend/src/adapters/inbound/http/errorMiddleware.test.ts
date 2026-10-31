import { describe, it, expect, vi } from 'vitest';
import { NextFunction, Request, Response } from 'express';
import {
  createGlobalErrorMiddleware,
  inferAlertCategoryFromPath,
} from './errorMiddleware';
import { ErrorAlertOutboundPort } from '../../../domain/ports/outbound/ErrorAlertOutboundPort';
import { markErrorAsAlerted } from '../../outbound/observability/ErrorObservabilityAdapter';

describe('Global Error Middleware', () => {
  it('infers the correct alert category from the request path', () => {
    expect(inferAlertCategoryFromPath('/api/orders')).toBe('ORDER_FAILURE');
    expect(inferAlertCategoryFromPath('/api/events/evt_1/tickets')).toBe('TICKET_FAILURE');
    expect(inferAlertCategoryFromPath('/api/event-tickets/t1/status')).toBe('TICKET_FAILURE');
    expect(inferAlertCategoryFromPath('/api/upload')).toBe('ADMIN_ACTION_FAILURE');
    expect(inferAlertCategoryFromPath('/api/products')).toBe('ADMIN_ACTION_FAILURE');
    expect(inferAlertCategoryFromPath('/api/health')).toBe('SYSTEM_ERROR');
  });

  it('reports unhandled errors via ErrorAlertOutboundPort and responds with JSON error', async () => {
    const mockErrorAlertPort: ErrorAlertOutboundPort = {
      reportError: vi.fn().mockResolvedValue({ logged: true, emailSent: true }),
    };

    const middleware = createGlobalErrorMiddleware(mockErrorAlertPort);
    const err = Object.assign(new Error('Unexpected JSON parse crash'), { status: 500 });
    const req = {
      method: 'POST',
      originalUrl: '/api/orders',
      path: '/orders',
    } as unknown as Request;
    const res = {
      headersSent: false,
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    await middleware(err, req, res, next);

    expect(mockErrorAlertPort.reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'ORDER_FAILURE',
        operation: 'POST /api/orders',
        errorMessage: 'Unexpected JSON parse crash',
        httpStatus: 500,
      })
    );
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unexpected JSON parse crash' });
  });

  it('does not re-alert if the error was already marked as alerted', async () => {
    const mockErrorAlertPort: ErrorAlertOutboundPort = {
      reportError: vi.fn().mockResolvedValue({ logged: true, emailSent: true }),
    };

    const middleware = createGlobalErrorMiddleware(mockErrorAlertPort);
    const err = new Error('Already handled');
    markErrorAsAlerted(err);

    const req = { method: 'POST', originalUrl: '/api/orders' } as unknown as Request;
    const res = {
      headersSent: false,
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as Response;
    const next = vi.fn() as unknown as NextFunction;

    await middleware(err, req, res, next);

    expect(mockErrorAlertPort.reportError).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
