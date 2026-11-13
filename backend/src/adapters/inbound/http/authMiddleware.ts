import { Request, Response, NextFunction } from 'express';
import { AdminAuthOutboundPort } from '../../../domain/ports/outbound/AdminAuthOutboundPort';

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (typeof authHeader !== 'string') {
    return null;
  }
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match && match[1] ? match[1].trim() : null;
}

export function isValidAdminRequest(
  req: Request,
  adminAuthAdapter?: AdminAuthOutboundPort
): boolean {
  if (!adminAuthAdapter || !adminAuthAdapter.verifyAdminToken) {
    return false;
  }
  const token = extractBearerToken(req);
  if (!token) {
    return false;
  }
  return adminAuthAdapter.verifyAdminToken(token);
}

export function createRequireAdminAuth(adminAuthAdapter: AdminAuthOutboundPort) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!isValidAdminRequest(req, adminAuthAdapter)) {
      res.status(401).json({ error: 'Unauthorized: Valid administrator session required.' });
      return;
    }
    next();
  };
}
