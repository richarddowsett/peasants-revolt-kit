import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { EventsController } from './EventsController';

describe('EventsController', () => {
  let controller: EventsController;
  let mockListEventsUseCase: { execute: ReturnType<typeof vi.fn> };
  let mockGetEventByIdUseCase: { execute: ReturnType<typeof vi.fn> };
  let mockCreateEventUseCase: { execute: ReturnType<typeof vi.fn> };
  let mockUpdateEventUseCase: { execute: ReturnType<typeof vi.fn> };
  let mockDeleteEventUseCase: { execute: ReturnType<typeof vi.fn> };
  let mockPurchaseTicketUseCase: { execute: ReturnType<typeof vi.fn> };
  let mockUpdateTicketStatusUseCase: { execute: ReturnType<typeof vi.fn>; resendTicketEmail: ReturnType<typeof vi.fn> };
  let mockVerifyQrUseCase: { execute: ReturnType<typeof vi.fn> };
  let mockTicketRepo: { listTicketsByEvent: ReturnType<typeof vi.fn> };
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockListEventsUseCase = { execute: vi.fn() };
    mockGetEventByIdUseCase = { execute: vi.fn() };
    mockCreateEventUseCase = { execute: vi.fn() };
    mockUpdateEventUseCase = { execute: vi.fn() };
    mockDeleteEventUseCase = { execute: vi.fn() };
    mockPurchaseTicketUseCase = { execute: vi.fn() };
    mockUpdateTicketStatusUseCase = { execute: vi.fn(), resendTicketEmail: vi.fn() };
    mockVerifyQrUseCase = { execute: vi.fn() };
    mockTicketRepo = { listTicketsByEvent: vi.fn() };

    controller = new EventsController(
      mockListEventsUseCase as unknown as ConstructorParameters<typeof EventsController>[0],
      mockGetEventByIdUseCase as unknown as ConstructorParameters<typeof EventsController>[1],
      mockCreateEventUseCase as unknown as ConstructorParameters<typeof EventsController>[2],
      mockUpdateEventUseCase as unknown as ConstructorParameters<typeof EventsController>[3],
      mockDeleteEventUseCase as unknown as ConstructorParameters<typeof EventsController>[4],
      mockPurchaseTicketUseCase as unknown as ConstructorParameters<typeof EventsController>[5],
      mockUpdateTicketStatusUseCase as unknown as ConstructorParameters<typeof EventsController>[6],
      mockVerifyQrUseCase as unknown as ConstructorParameters<typeof EventsController>[7],
      mockTicketRepo as unknown as ConstructorParameters<typeof EventsController>[8]
    );

    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
  });

  it('listEvents returns event list', async () => {
    mockListEventsUseCase.execute.mockResolvedValueOnce([{ id: 'evt_1' }]);
    const req = { query: { includePast: 'true' } } as unknown as Request;

    await controller.listEvents(req, mockRes as Response);
    expect(mockListEventsUseCase.execute).toHaveBeenCalledWith({ includePast: true });
    expect(mockRes.json).toHaveBeenCalledWith([{ id: 'evt_1' }]);
  });

  it('listEvents handles errors with status 500', async () => {
    mockListEventsUseCase.execute.mockRejectedValueOnce(new Error('fail'));
    const req = { query: {} } as unknown as Request;

    await controller.listEvents(req, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'fail' });
  });

  it('getEventById returns event or 404 if not found', async () => {
    mockGetEventByIdUseCase.execute.mockResolvedValueOnce({ id: 'evt_1' });
    const req = { params: { id: 'evt_1' } } as unknown as Request;

    await controller.getEventById(req, mockRes as Response);
    expect(mockRes.json).toHaveBeenCalledWith({ id: 'evt_1' });

    mockGetEventByIdUseCase.execute.mockResolvedValueOnce(null);
    await controller.getEventById(req, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(404);
  });

  it('createEvent creates event with status 201', async () => {
    mockCreateEventUseCase.execute.mockResolvedValueOnce({ id: 'evt_new' });
    const req = { body: { title: 'Party' } } as unknown as Request;

    await controller.createEvent(req, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({ id: 'evt_new' });
  });

  it('updateEvent and deleteEvent handle requests and errors', async () => {
    mockUpdateEventUseCase.execute.mockResolvedValueOnce({ id: 'evt_1', title: 'Updated' });
    const updateReq = { params: { id: 'evt_1' }, body: { title: 'Updated' } } as unknown as Request;

    await controller.updateEvent(updateReq, mockRes as Response);
    expect(mockRes.json).toHaveBeenCalledWith({ id: 'evt_1', title: 'Updated' });

    mockDeleteEventUseCase.execute.mockResolvedValueOnce(undefined);
    const deleteReq = { params: { id: 'evt_1' } } as unknown as Request;
    await controller.deleteEvent(deleteReq, mockRes as Response);
    expect(mockRes.json).toHaveBeenCalledWith({ deleted: true });
  });

  it('createEvent, updateEvent, and deleteEvent handle error responses with 400', async () => {
    mockCreateEventUseCase.execute.mockRejectedValueOnce(new Error('Invalid title'));
    await controller.createEvent({ body: {} } as Request, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(400);

    mockUpdateEventUseCase.execute.mockRejectedValueOnce(new Error('Not found'));
    await controller.updateEvent({ params: { id: 'evt_1' }, body: {} } as unknown as Request, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(400);

    mockDeleteEventUseCase.execute.mockRejectedValueOnce(new Error('Cannot delete'));
    await controller.deleteEvent({ params: { id: 'evt_1' } } as unknown as Request, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('purchaseTicket, listTickets, updateStatus, resendEmail, and verifyQr handle error responses', async () => {
    mockPurchaseTicketUseCase.execute.mockRejectedValueOnce(new Error('Sold out'));
    await controller.purchaseTicket({ params: { id: 'evt_1' }, body: {} } as unknown as Request, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(400);

    mockTicketRepo.listTicketsByEvent.mockRejectedValueOnce(new Error('DB error'));
    await controller.listEventTickets({ params: { id: 'evt_1' } } as unknown as Request, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(500);

    mockUpdateTicketStatusUseCase.execute.mockRejectedValueOnce(new Error('Ticket missing'));
    await controller.updateTicketStatus({ params: { ticketId: 't_1' }, body: {} } as unknown as Request, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(400);

    mockUpdateTicketStatusUseCase.resendTicketEmail.mockRejectedValueOnce(new Error('Email error'));
    await controller.resendTicketEmail({ params: { ticketId: 't_1' } } as unknown as Request, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(400);

    mockVerifyQrUseCase.execute.mockRejectedValueOnce(new Error('QR Invalid'));
    await controller.verifyAndCheckInQr({ body: {} } as Request, mockRes as Response);
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });
});
