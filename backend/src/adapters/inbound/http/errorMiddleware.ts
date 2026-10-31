import { NextFunction, Request, Response } from 'express';
import {
  AlertCategory,
  ErrorAlertOutboundPort,
} from '../../../domain/ports/outbound/ErrorAlertOutboundPort';
import { isErrorAlreadyAlerted } from '../../outbound/observability/ErrorObservabilityAdapter';

export function inferAlertCategoryFromPath(path: string): AlertCategory {
  const lower = (path || '').toLowerCase();
  if (lower.includes('/orders')) return 'ORDER_FAILURE';
  if (lower.includes('/events') || lower.includes('/event-tickets')) return 'TICKET_FAILURE';
  if (lower.includes('/upload') || lower.includes('/admin') || lower.includes('/products')) {
    return 'ADMIN_ACTION_FAILURE';
  }
  return 'SYSTEM_ERROR';
}

export function createGlobalErrorMiddleware(errorAlertPort: ErrorAlertOutboundPort) {
  return async (
    err: Error & { status?: number; statusCode?: number },
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    const operation = `${req.method || 'UNKNOWN'} ${req.originalUrl || req.path || '/'}`;

    if (!isErrorAlreadyAlerted(err)) {
      await errorAlertPort.reportError({
        category: inferAlertCategoryFromPath(req.originalUrl || req.path || ''),
        operation,
        errorMessage: message,
        stack: err.stack,
        httpStatus: status,
      });
    }

    if (!res.headersSent) {
      res.status(status).json({ error: message });
    }
  };
}
