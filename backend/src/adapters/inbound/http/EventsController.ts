import { Request, Response } from 'express';
import {
  CreateEventInboundPort,
  DeleteEventInboundPort,
  GetEventByIdInboundPort,
  ListEventsInboundPort,
  PurchaseEventTicketInboundPort,
  UpdateEventInboundPort,
  UpdateEventTicketStatusInboundPort,
  VerifyAndCheckInEventTicketInboundPort,
} from '../../../domain/ports/inbound/EventInboundPorts';
import { EventTicketRepositoryOutboundPort } from '../../../domain/ports/outbound/EventTicketRepositoryOutboundPort';

export class EventsController {
  constructor(
    private listEventsUseCase: ListEventsInboundPort,
    private getEventByIdUseCase: GetEventByIdInboundPort,
    private createEventUseCase: CreateEventInboundPort,
    private updateEventUseCase: UpdateEventInboundPort,
    private deleteEventUseCase: DeleteEventInboundPort,
    private purchaseEventTicketUseCase: PurchaseEventTicketInboundPort,
    private updateEventTicketStatusUseCase: UpdateEventTicketStatusInboundPort,
    private verifyAndCheckInEventTicketUseCase: VerifyAndCheckInEventTicketInboundPort,
    private ticketRepo: EventTicketRepositoryOutboundPort
  ) {}

  async listEvents(req: Request, res: Response): Promise<void> {
    try {
      const includePast = req.query.includePast === 'true';
      const events = await this.listEventsUseCase.execute({ includePast });
      res.json(events);
    } catch (err: any) {
      console.error('[Events API ERROR] listEvents failed:', err.message);
      res.status(500).json({ error: err.message });
    }
  }

  async getEventById(req: Request, res: Response): Promise<void> {
    try {
      const eventWithStats = await this.getEventByIdUseCase.execute(req.params.id);
      if (!eventWithStats) {
        res.status(404).json({ error: 'Event not found.' });
        return;
      }
      res.json(eventWithStats);
    } catch (err: any) {
      console.error('[Events API ERROR] getEventById failed:', err.message);
      res.status(500).json({ error: err.message });
    }
  }

  async createEvent(req: Request, res: Response): Promise<void> {
    try {
      const created = await this.createEventUseCase.execute(req.body);
      res.status(201).json(created);
    } catch (err: any) {
      console.error('[Events API ERROR] createEvent failed:', err.message);
      res.status(400).json({ error: err.message });
    }
  }

  async updateEvent(req: Request, res: Response): Promise<void> {
    try {
      const updated = await this.updateEventUseCase.execute(req.params.id, req.body);
      res.json(updated);
    } catch (err: any) {
      console.error('[Events API ERROR] updateEvent failed:', err.message);
      res.status(400).json({ error: err.message });
    }
  }

  async deleteEvent(req: Request, res: Response): Promise<void> {
    try {
      await this.deleteEventUseCase.execute(req.params.id);
      res.json({ deleted: true });
    } catch (err: any) {
      console.error('[Events API ERROR] deleteEvent failed:', err.message);
      res.status(400).json({ error: err.message });
    }
  }

  async purchaseTicket(req: Request, res: Response): Promise<void> {
    try {
      const ticket = await this.purchaseEventTicketUseCase.execute({
        eventId: req.params.id,
        userName: req.body?.userName,
        userEmail: req.body?.userEmail,
        userId: req.body?.userId,
      });
      res.status(201).json(ticket);
    } catch (err: any) {
      console.error('[Events API ERROR] purchaseTicket failed:', err.message);
      res.status(400).json({ error: err.message });
    }
  }

  async listEventTickets(req: Request, res: Response): Promise<void> {
    try {
      const tickets = await this.ticketRepo.listTicketsByEvent(req.params.id);
      res.json(tickets);
    } catch (err: any) {
      console.error('[Events API ERROR] listEventTickets failed:', err.message);
      res.status(500).json({ error: err.message });
    }
  }

  async updateTicketStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.body;
      const updated = await this.updateEventTicketStatusUseCase.execute(
        req.params.ticketId,
        status
      );
      res.json(updated);
    } catch (err: any) {
      console.error('[Events API ERROR] updateTicketStatus failed:', err.message);
      res.status(400).json({ error: err.message });
    }
  }

  async resendTicketEmail(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.updateEventTicketStatusUseCase.resendTicketEmail(
        req.params.ticketId
      );
      res.json(result);
    } catch (err: any) {
      console.error('[Events API ERROR] resendTicketEmail failed:', err.message);
      res.status(400).json({ error: err.message });
    }
  }

  async verifyAndCheckInQr(req: Request, res: Response): Promise<void> {
    try {
      const { ticketUuid, eventId } = req.body || {};
      const result = await this.verifyAndCheckInEventTicketUseCase.execute(
        ticketUuid,
        eventId
      );
      res.json(result);
    } catch (err: any) {
      console.error('[Events API ERROR] verifyAndCheckInQr failed:', err.message);
      res.status(400).json({ error: err.message });
    }
  }
}
