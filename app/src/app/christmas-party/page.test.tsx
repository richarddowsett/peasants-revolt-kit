import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChristmasPartyPage from './page';
import * as api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  fetchChristmasPartyStatus: vi.fn(),
  purchaseChristmasPartyTicket: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  auth: null,
}));

describe('ChristmasPartyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays the "No Christmas party, please check Instagram for more details" holding page when no party date is set', async () => {
    vi.mocked(api.fetchChristmasPartyStatus).mockResolvedValue({
      settings: {
        eventYear: null,
        saleStartAt: '',
        maxTickets: 50,
        ticketPrice: 25,
        partyDateTime: '',
        partyLocation: '',
        fromEmail: 'Peasants Running Club <christmas@peasants-running-kit.store>',
        updatedAt: '2026-10-01T00:00:00Z',
      },
      isPartyScheduled: false,
      isSaleOpen: false,
      ticketsSold: 0,
      ticketsRemaining: 0,
    });

    render(<ChristmasPartyPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/No Christmas party, please check Instagram for more details/i)
      ).toBeInTheDocument();
    });

    const igLink = screen.getByRole('link', { name: /Follow @prrcbrentwood/i });
    expect(igLink).toHaveAttribute('href', 'https://www.instagram.com/prrcbrentwood/');
  });

  it('displays the countdown holding page when saleStartAt is in the future', async () => {
    const futureSale = new Date(Date.now() + 3600_000).toISOString();
    vi.mocked(api.fetchChristmasPartyStatus).mockResolvedValue({
      settings: {
        eventYear: 2026,
        saleStartAt: futureSale,
        maxTickets: 40,
        ticketPrice: 25,
        partyDateTime: '2026-12-19T19:30:00.000Z',
        partyLocation: 'Brentwood Brewery',
        fromEmail: 'Peasants Running Club <christmas@peasants-running-kit.store>',
        updatedAt: '2026-10-01T00:00:00Z',
      },
      isPartyScheduled: true,
      isSaleOpen: false,
      ticketsSold: 0,
      ticketsRemaining: 40,
    });

    render(<ChristmasPartyPage />);

    await waitFor(() => {
      expect(screen.getByTestId('christmas-party-countdown')).toBeInTheDocument();
    });
    expect(screen.getByText(/Limited to 40 Tickets/i)).toBeInTheDocument();
    expect(screen.getByText(/Brentwood Brewery/i)).toBeInTheDocument();
  });

  it('switches to the ticket purchase form when the countdown has finished and lets a customer buy a ticket via Monzo', async () => {
    const pastSale = new Date(Date.now() - 60_000).toISOString();
    vi.mocked(api.fetchChristmasPartyStatus).mockResolvedValue({
      settings: {
        eventYear: 2026,
        saleStartAt: pastSale,
        maxTickets: 50,
        ticketPrice: 25,
        partyDateTime: '2026-12-19T19:30:00.000Z',
        partyLocation: 'Brentwood Brewery',
        fromEmail: 'Peasants Running Club <christmas@peasants-running-kit.store>',
        updatedAt: '2026-10-01T00:00:00Z',
      },
      isPartyScheduled: true,
      isSaleOpen: true,
      ticketsSold: 10,
      ticketsRemaining: 40,
    });

    vi.mocked(api.purchaseChristmasPartyTicket).mockResolvedValue({
      id: 'PRRC-XMAS-2026-0011',
      userName: 'Jane Runner',
      userEmail: 'jane@example.com',
      items: [
        {
          productId: 'christmas_party_2026_ticket',
          productName: 'PRRC Christmas Party 2026 Ticket',
          price: 25,
          size: '1 Ticket',
          quantity: 1,
          subtotal: 25,
        },
      ],
      totalAmount: 25,
      status: 'pending_payment',
      paymentLinkUrl: 'https://monzo.me/terenceanthonysumpter/25.00?d=PRRC-XMAS-2026-0011',
      monzoReference: 'PRRC-XMAS-2026-0011',
      orderType: 'christmas_2026_ticket',
      ticketUuid: '550e8400-e29b-41d4-a716-446655440000',
      eventYear: 2026,
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    });

    render(<ChristmasPartyPage />);

    await waitFor(() => {
      expect(screen.getByTestId('christmas-party-purchase')).toBeInTheDocument();
    });

    expect(screen.getByText(/40 of 50 tickets remaining/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'Jane Runner' },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Buy Christmas Party Ticket/i }));

    await waitFor(() => {
      expect(screen.getByTestId('christmas-ticket-monzo-step')).toBeInTheDocument();
    });

    expect(screen.getByText('PRRC-XMAS-2026-0011')).toBeInTheDocument();
    const monzoLink = screen.getByRole('link', { name: /Pay £25.00 via Monzo/i });
    expect(monzoLink).toHaveAttribute(
      'href',
      'https://monzo.me/terenceanthonysumpter/25.00?d=PRRC-XMAS-2026-0011'
    );
  });
});
