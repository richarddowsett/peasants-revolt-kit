import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EventsAdminPanel from './EventsAdminPanel';
import * as api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  fetchEvents: vi.fn(),
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  fetchEventTickets: vi.fn(),
  updateEventTicketStatus: vi.fn(),
  resendEventTicketEmail: vi.fn(),
  verifyEventTicketQr: vi.fn(),
  uploadImage: vi.fn(),
}));

describe('EventsAdminPanel', () => {
  const sampleEventWithStats = {
    event: {
      id: 'evt_1',
      title: 'PRRC Christmas Party 2026',
      description: 'Festive celebration',
      startDate: '2026-12-19T19:30:00.000Z',
      saleStartAt: '2026-11-01T09:00:00.000Z',
      maxTickets: 50,
      ticketPrice: 25,
      address: 'The Brentwood Tap, CM14',
      logoUrl: '',
      fromEmail: 'Peasants Running Club <events@peasants-running-kit.store>',
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
    },
    isSaleOpen: true,
    ticketsSold: 1,
    ticketsRemaining: 49,
    ticketsCheckedIn: 0,
  };

  const sampleTicket = {
    id: 'PRRC-EVT-2026-0001',
    eventId: 'evt_1',
    eventTitle: 'PRRC Christmas Party 2026',
    eventStartDate: '2026-12-19T19:30:00.000Z',
    eventAddress: 'The Brentwood Tap, CM14',
    userName: 'Alice Runner',
    userEmail: 'alice@example.com',
    unitPrice: 25,
    status: 'payment_successful' as const,
    paymentLinkUrl: 'https://monzo.me/test',
    monzoReference: 'PRRC-EVT-2026-0001',
    ticketUuid: '550e8400-e29b-41d4-a716-446655440000',
    ticketEmailSentAt: '2026-11-02T10:05:00.000Z',
    checkedIn: false,
    createdAt: '2026-11-02T10:00:00.000Z',
    updatedAt: '2026-11-02T10:05:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchEvents).mockResolvedValue([sampleEventWithStats]);
    vi.mocked(api.fetchEventTickets).mockResolvedValue([sampleTicket]);
  });

  it('loads events and tickets and allows creating a new event', async () => {
    vi.mocked(api.createEvent).mockResolvedValue({
      ...sampleEventWithStats.event,
      id: 'evt_2',
      title: 'PRRC Summer Track Night',
    });

    render(<EventsAdminPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('admin-event-card-evt_1')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Add New Event/i }));
    expect(screen.getByTestId('event-admin-form')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Event Title/i), {
      target: { value: 'PRRC Summer Track Night' },
    });
    fireEvent.change(screen.getByLabelText(/Event Description/i), {
      target: { value: '5000m track time trials and pizza!' },
    });
    fireEvent.change(screen.getByLabelText(/Event Start Date/i), {
      target: { value: '2026-07-15T18:30' },
    });
    fireEvent.change(screen.getByLabelText(/Ticket Sale Countdown/i), {
      target: { value: '2026-06-01T09:00' },
    });
    fireEvent.change(screen.getByLabelText(/Event Address/i), {
      target: { value: 'Melbourne Park Athletics Track' },
    });

    fireEvent.submit(screen.getByTestId('event-admin-form'));

    await waitFor(() => {
      expect(api.createEvent).toHaveBeenCalledTimes(1);
    });
  });

  it('verifies a ticket UUID via the Door QR Scanner and displays the check-in confirmation banner', async () => {
    vi.mocked(api.verifyEventTicketQr).mockResolvedValue({
      valid: true,
      status: 'checked_in_now',
      message: 'Entry confirmed! Alice Runner (PRRC-EVT-2026-0001) is now checked in.',
      ticket: {
        ...sampleTicket,
        checkedIn: true,
        status: 'completed',
      },
    });

    render(<EventsAdminPanel />);

    await waitFor(() => {
      expect(screen.getByTestId('admin-event-card-evt_1')).toBeInTheDocument();
    });

    const uuidInput = screen.getByLabelText(/Ticket UUID/i);
    fireEvent.change(uuidInput, {
      target: { value: '550e8400-e29b-41d4-a716-446655440000' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Verify & Check In/i }));

    await waitFor(() => {
      expect(screen.getByTestId('qr-scan-result')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Entry confirmed! Alice Runner \(PRRC-EVT-2026-0001\) is now checked in\./i)
    ).toBeInTheDocument();
    expect(api.verifyEventTicketQr).toHaveBeenCalledWith(
      '550e8400-e29b-41d4-a716-446655440000',
      'evt_1'
    );
  });
});
