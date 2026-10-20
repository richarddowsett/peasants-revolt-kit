import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ChristmasPartyAdminPanel from './ChristmasPartyAdminPanel';
import * as api from '@/lib/api';
import { Order } from '@/domain/models/Order';

vi.mock('@/lib/api', () => ({
  fetchChristmasPartyStatus: vi.fn(),
  updateChristmasPartySettings: vi.fn(),
  verifyChristmasTicketQr: vi.fn(),
  resendChristmasTicketEmail: vi.fn(),
}));

describe('ChristmasPartyAdminPanel', () => {
  const sampleOrders: Order[] = [
    {
      id: 'PRRC-XMAS-2026-0001',
      userName: 'Alice Runner',
      userEmail: 'alice@example.com',
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
      paymentLinkUrl: 'https://monzo.me/test/25.00?d=PRRC-XMAS-2026-0001',
      monzoReference: 'PRRC-XMAS-2026-0001',
      orderType: 'christmas_2026_ticket',
      ticketUuid: '550e8400-e29b-41d4-a716-446655440000',
      eventYear: 2026,
      createdAt: '2026-11-01T10:00:00Z',
      updatedAt: '2026-11-01T10:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchChristmasPartyStatus).mockResolvedValue({
      settings: {
        eventYear: 2026,
        saleStartAt: '2026-11-01T09:00:00.000Z',
        maxTickets: 50,
        ticketPrice: 25,
        partyDateTime: '2026-12-19T19:30:00.000Z',
        partyLocation: 'Brentwood Brewery',
        fromEmail: 'Peasants Running Club <christmas@peasants-running-kit.store>',
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
      isPartyScheduled: true,
      isSaleOpen: true,
      ticketsSold: 1,
      ticketsRemaining: 49,
    });
  });

  it('renders Christmas party configuration, ticket orders, and allows marking payment received', async () => {
    const onUpdateOrderStatus = vi.fn().mockResolvedValue(undefined);
    const onCancelOrder = vi.fn().mockResolvedValue(undefined);
    const onRefreshOrders = vi.fn().mockResolvedValue(undefined);

    render(
      <ChristmasPartyAdminPanel
        orders={sampleOrders}
        updatingOrderId={null}
        onUpdateOrderStatus={onUpdateOrderStatus}
        onCancelOrder={onCancelOrder}
        onRefreshOrders={onRefreshOrders}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('PRRC-XMAS-2026-0001')).toBeInTheDocument();
    });

    const markPaidBtn = screen.getByRole('button', {
      name: /Mark Payment Received & Email Ticket/i,
    });
    fireEvent.click(markPaidBtn);

    expect(onUpdateOrderStatus).toHaveBeenCalledWith(
      'PRRC-XMAS-2026-0001',
      'payment_successful'
    );
  });

  it('verifies a ticket UUID at the door and shows the auto check-in confirmation banner', async () => {
    vi.mocked(api.verifyChristmasTicketQr).mockResolvedValue({
      valid: true,
      reason: 'CHECKED_IN',
      message: 'Entry confirmed for Alice Runner!',
      order: {
        ...sampleOrders[0],
        status: 'completed',
        checkedIn: true,
        checkedInAt: '2026-12-19T19:35:00.000Z',
      },
    });

    render(
      <ChristmasPartyAdminPanel
        orders={sampleOrders}
        updatingOrderId={null}
        onUpdateOrderStatus={vi.fn()}
        onCancelOrder={vi.fn()}
        onRefreshOrders={vi.fn().mockResolvedValue(undefined)}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/Verify Ticket UUID/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Verify Ticket UUID/i), {
      target: { value: '550e8400-e29b-41d4-a716-446655440000' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Verify & Check In/i }));

    await waitFor(() => {
      expect(screen.getByTestId('qr-scan-result')).toBeInTheDocument();
    });
    expect(screen.getByText(/Entry Confirmed — Checked In!/i)).toBeInTheDocument();
    expect(screen.getByText(/Entry confirmed for Alice Runner!/i)).toBeInTheDocument();
  });
});
