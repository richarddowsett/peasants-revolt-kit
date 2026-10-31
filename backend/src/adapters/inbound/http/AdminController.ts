import { Request, Response } from 'express';
import { AdminAuthOutboundPort } from '../../../domain/ports/outbound/AdminAuthOutboundPort';
import { ErrorAlertOutboundPort } from '../../../domain/ports/outbound/ErrorAlertOutboundPort';
import { isErrorAlreadyAlerted } from '../../outbound/observability/ErrorObservabilityAdapter';

export class AdminController {
  constructor(
    private adminAuthAdapter: AdminAuthOutboundPort,
    private errorAlertPort?: ErrorAlertOutboundPort
  ) {}

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { password } = req.body;
      const isValid = await this.adminAuthAdapter.verifyAdminPassword(password);
      if (isValid) {
        res.json({ success: true, token: 'admin_session_valid' });
      } else {
        res.status(401).json({ success: false, error: 'Incorrect admin password' });
      }
    } catch (err: unknown) {
      const message = (err as Error).message;
      if (this.errorAlertPort && !isErrorAlreadyAlerted(err)) {
        await this.errorAlertPort.reportError({
          category: 'ADMIN_ACTION_FAILURE',
          operation: 'POST /api/admin/login',
          errorMessage: message,
          stack: (err as Error).stack,
          httpStatus: 500,
        });
      }
      res.status(500).json({ error: message });
    }
  }
}
