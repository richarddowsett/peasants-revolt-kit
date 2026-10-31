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
import { ErrorAlertOutboundPort } from '../../../domain/ports/outbound/ErrorAlertOutboundPort';
import {
  isErrorAlreadyAlerted,
  isTicketPurchaseBusinessValidationError,
} from '../../outbound/observability/ErrorObservabilityAdapter';

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
    private ticketRepo: EventTicketRepositoryOutboundPort,
    private errorAlertPort?: ErrorAlertOutboundPort
  ) {}

  async listEvents(req: Request, res: Response): Promise<void> {
    try {
      const includePast = req.query.includePast === 'true';
      const events = await this.listEventsUseCase.execute({ includePast });
      res.json(events);
    } catch (err: unknown) {
      const message = (err as Error).message;
      console.error('[Events API ERROR] listEvents failed:', message);
      if (this.errorAlertPort && !isErrorAlreadyAlerted(err)) {
        await this.errorAlertPort.reportError({
          category: 'TICKET_FAILURE',
          operation: 'GET /api/events',
          errorMessage: message,
          stack: (err as Error).stack,
          httpStatus: 500,
        });
      }
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
      if (this.errorAlertPort && !isErrorAlreadyAlerted(err)) {
        await this.errorAlertPort.reportError({
          category: 'TICKET_FAILURE',
          operation: 'GET /api/events/:id',
          errorMessage: message,
          stack: (err as Error).stack,
          httpStatus: 500,
          metadata: { eventId: req.params?.id },
        });
      }
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
      if (this.errorAlertPort && !isErrorAlreadyAlerted(err)) {
        await this.errorAlertPort.reportError({
          category: 'ADMIN_ACTION_FAILURE',
          operation: 'POST /api/events',
          errorMessage: message,
          stack: (err as Error).stack,
          httpStatus: 400,
          metadata: { title: req.body?.title },
        });
      }
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
      if (this.errorAlertPort && !isErrorAlreadyAlerted(err)) {
        await this.errorAlertPort.reportError({
          category: 'ADMIN_ACTION_FAILURE',
          operation: 'PUT /api/events/:id',
          errorMessage: message,
          stack: (err as Error).stack,
          httpStatus: 400,
          metadata: { eventId: req.params?.id, title: req.body?.title },
        });
      }
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
      if (this.errorAlertPort && !isErrorAlreadyAlerted(err)) {
        await this.errorAlertPort.reportError({
          category: 'ADMIN_ACTION_FAILURE',
          operation: 'DELETE /api/events/:id',
          errorMessage: message,
          stack: (err as Error).stack,
          httpStatus: 400,
          metadata: { eventId: req.params?.id },
        });
      }
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
      const isServerError =
        message.toLowerCase().includes('database') ||
        message.toLowerCase().includes('firestore');
      const httpStatus = isServerError ? 500 : 400;

      if (
        this.errorAlertPort &&
        !isTicketPurchaseBusinessValidationError(message) &&
        !isErrorAlreadyAlerted(err)
      ) {
        const isEmailError =
          message.toLowerCase().includes('resend') ||
          message.toLowerCase().includes('ticket email') ||
          message.toLowerCase().includes('ticketuuid');

        await this.errorAlertPort.reportError({
          category: isEmailError ? 'EMAIL_DELIVERY_FAILURE' : 'TICKET_FAILURE',
          operation: 'POST /api/events/:id/tickets',
          errorMessage: message,
          stack: (err as Error).stack,
          httpStatus,
          metadata: {
            eventId: req.params?.id,
            userName: req.body?.userName,
            userEmail: req.body?.userEmail,
          },
        });
      }

      res.status(httpStatus).json({ error: message });
    }
  }

  async listEventTickets(req: Request, res: Response): Promise<void> {
    try {
      const tickets = await this.ticketRepo.listTicketsByEvent(req.params.id);
      res.json(tickets);
    } catch (err: unknown) {
      const message = (err as Error).message;
      console.error('[Events API ERROR] listEventTickets failed:', message);
      if (this.errorAlertPort && !isErrorAlreadyAlerted(err)) {
        await this.errorAlertPort.reportError({
          category: 'ADMIN_ACTION_FAILURE',
          operation: 'GET /api/events/:id/tickets',
          errorMessage: message,
          stack: (err as Error).stack,
          httpStatus: 500,
          metadata: { eventId: req.params?.id },
        });
      }
      res.status(500).json({ error: message });
    }
  }

  async updateTicketStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status, reason } = req.body || {};
      const updated = await this.updateEventTicketStatusUseCase.execute(
        req.params.ticketId,
        status,
        reason
      );
      res.json(updated);
    } catch (err: unknown) {
      const message = (err as Error).message;
      console.error('[Events API ERROR] updateTicketStatus failed:', message);
      if (this.errorAlertPort && !isErrorAlreadyAlerted(err)) {
        const isEmailError =
          message.toLowerCase().includes('resend') ||
          message.toLowerCase().includes('ticket email') ||
          message.toLowerCase().includes('ticketuuid');

        await this.errorAlertPort.reportError({
          category: isEmailError ? 'EMAIL_DELIVERY_FAILURE' : 'ADMIN_ACTION_FAILURE',
          operation: 'PATCH /api/event-tickets/:ticketId/status',
          errorMessage: message,
          stack: (err as Error).stack,
          httpStatus: 400,
          metadata: {
            ticketId: req.params?.ticketId,
            status: req.body?.status,
          },
        });
      }
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
      if (this.errorAlertPort && !isErrorAlreadyAlerted(err)) {
        await this.errorAlertPort.reportError({
          category: 'EMAIL_DELIVERY_FAILURE',
          operation: 'POST /api/event-tickets/:ticketId/resend-email',
          errorMessage: message,
          stack: (err as Error).stack,
          httpStatus: 400,
          metadata: { ticketId: req.params?.ticketId },
        });
      }
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
      if (this.errorAlertPort && !isErrorAlreadyAlerted(err)) {
        await this.errorAlertPort.reportError({
          category: 'ADMIN_ACTION_FAILURE',
          operation: 'POST /api/events/verify-qr',
          errorMessage: message,
          stack: (err as Error).stack,
          httpStatus: 400,
          metadata: {
            ticketUuid: req.body?.ticketUuid,
            eventId: req.body?.eventId,
          },
        });
      }
      res.status(400).json({ error: message });
    }
  }
}
