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
    } catch (err: unknown) {
      const message = (err as Error).message;
      console.error('[Events API ERROR] listEvents failed:', message);
      res.status(500).json({ error: message });
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
    } catch (err: unknown) {
      const message = (err as Error).message;
      console.error('[Events API ERROR] getEventById failed:', message);
      res.status(500).json({ error: message });
    }
  }

  async createEvent(req: Request, res: Response): Promise<void> {
    try {
      const created = await this.createEventUseCase.execute(req.body);
      res.status(201).json(created);
    } catch (err: unknown) {
      const message = (err as Error).message;
      console.error('[Events API ERROR] createEvent failed:', message);
      res.status(400).json({ error: message });
    }
  }

  async updateEvent(req: Request, res: Response): Promise<void> {
    try {
      const updated = await this.updateEventUseCase.execute(req.params.id, req.body);
      res.json(updated);
    } catch (err: unknown) {
      const message = (err as Error).message;
      console.error('[Events API ERROR] updateEvent failed:', message);
      res.status(400).json({ error: message });
    }
  }

  async deleteEvent(req: Request, res: Response): Promise<void> {
    try {
      await this.deleteEventUseCase.execute(req.params.id);
      res.json({ deleted: true });
    } catch (err: unknown) {
      const message = (err as Error).message;
      console.error('[Events API ERROR] deleteEvent failed:', message);
      res.status(400).json({ error: message });
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
    } catch (err: unknown) {
      const message = (err as Error).message;
      console.error('[Events API ERROR] purchaseTicket failed:', message);
      res.status(400).json({ error: message });
    }
  }

  async listEventTickets(req: Request, res: Response): Promise<void> {
    try {
      const tickets = await this.ticketRepo.listTicketsByEvent(req.params.id);
      res.json(tickets);
    } catch (err: unknown) {
      const message = (err as Error).message;
      console.error('[Events API ERROR] listEventTickets failed:', message);
      res.status(500).json({ error: message });
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
    } catch (err: unknown) {
      const message = (err as Error).message;
      console.error('[Events API ERROR] updateTicketStatus failed:', message);
      res.status(400).json({ error: message });
    }
  }

  async resendTicketEmail(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.updateEventTicketStatusUseCase.resendTicketEmail(
        req.params.ticketId
      );
      res.json(result);
    } catch (err: unknown) {
      const message = (err as Error).message;
      console.error('[Events API ERROR] resendTicketEmail failed:', message);
      res.status(400).json({ error: message });
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
    } catch (err: unknown) {
      const message = (err as Error).message;
      console.error('[Events API ERROR] verifyAndCheckInQr failed:', message);
      res.status(400).json({ error: message });
    }
  }
}
