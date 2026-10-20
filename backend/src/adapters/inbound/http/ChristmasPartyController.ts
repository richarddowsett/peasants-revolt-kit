import { Request, Response } from 'express';
import { GetChristmasPartyStatusInboundPort } from '../../../domain/ports/inbound/GetChristmasPartyStatusInboundPort';
import { UpdateChristmasPartySettingsInboundPort } from '../../../domain/ports/inbound/UpdateChristmasPartySettingsInboundPort';
import { PurchaseChristmasTicketInboundPort } from '../../../domain/ports/inbound/PurchaseChristmasTicketInboundPort';
import { VerifyAndCheckInTicketInboundPort } from '../../../domain/ports/inbound/VerifyAndCheckInTicketInboundPort';
import { UpdateOrderStatusInboundPort } from '../../../domain/ports/inbound/UpdateOrderStatusInboundPort';

export class ChristmasPartyController {
  constructor(
    private getStatusUseCase: GetChristmasPartyStatusInboundPort,
    private updateSettingsUseCase: UpdateChristmasPartySettingsInboundPort,
    private purchaseTicketUseCase: PurchaseChristmasTicketInboundPort,
    private verifyAndCheckInUseCase: VerifyAndCheckInTicketInboundPort,
    private updateOrderStatusUseCase?: UpdateOrderStatusInboundPort
  ) {}

  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = await this.getStatusUseCase.execute();
      res.json(status);
    } catch (err: any) {
      console.error('[ChristmasParty API ERROR] getStatus failed:', err.message);
      res.status(500).json({ error: err.message });
    }
  }

  async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const updated = await this.updateSettingsUseCase.execute(req.body || {});
      const status = await this.getStatusUseCase.execute();
      res.json({ settings: updated, status });
    } catch (err: any) {
      console.error('[ChristmasParty API ERROR] updateSettings failed:', err.message);
      res.status(400).json({ error: err.message });
    }
  }

  async purchaseTicket(req: Request, res: Response): Promise<void> {
    try {
      const order = await this.purchaseTicketUseCase.execute(req.body || {});
      res.status(201).json(order);
    } catch (err: any) {
      console.error('[ChristmasParty API ERROR] purchaseTicket failed:', err.message);
      res.status(400).json({ error: err.message });
    }
  }

  async verifyQrAndCheckIn(req: Request, res: Response): Promise<void> {
    try {
      const { ticketUuid } = req.body || {};
      const result = await this.verifyAndCheckInUseCase.execute(String(ticketUuid || ''));
      res.json(result);
    } catch (err: any) {
      console.error('[ChristmasParty API ERROR] verifyQrAndCheckIn failed:', err.message);
      res.status(400).json({ error: err.message });
    }
  }

  async resendTicketEmail(req: Request, res: Response): Promise<void> {
    try {
      if (!this.updateOrderStatusUseCase?.resendTicketEmail) {
        res.status(501).json({ error: 'Ticket email resend is not configured.' });
        return;
      }
      const order = await this.updateOrderStatusUseCase.resendTicketEmail(req.params.id);
      res.json(order);
    } catch (err: any) {
      console.error('[ChristmasParty API ERROR] resendTicketEmail failed:', err.message);
      res.status(400).json({ error: err.message });
    }
  }
}
