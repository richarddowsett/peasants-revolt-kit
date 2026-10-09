import { Request, Response } from 'express';
import { AdminAuthOutboundPort } from '../../../domain/ports/outbound/AdminAuthOutboundPort';

export class AdminController {
  constructor(private adminAuthAdapter: AdminAuthOutboundPort) {}

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { password } = req.body;
      const isValid = await this.adminAuthAdapter.verifyAdminPassword(password);
      if (isValid) {
        res.json({ success: true, token: 'admin_session_valid' });
      } else {
        res.status(401).json({ success: false, error: 'Incorrect admin password' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
