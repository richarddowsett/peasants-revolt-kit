import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ClubEventsPage from './page';
import * as api from '@/lib/api';

vi.mock('@/components/StoreHeader', () => ({
  default: () => <div data-testid="mock-store-header">Store Header</div>,
}));

vi.mock('@/components/StoreFooter', () => ({
  default: () => <div data-testid="mock-store-footer">Store Footer</div>,
}));

vi.mock('@/components/StoreLoginScreen', () => ({
  default: () => <div data-testid="mock-login-screen">Login Screen</div>,
}));

vi.mock('@/lib/firebase', () => ({
  auth: null,
}));

vi.mock('@/lib/api', () => ({
  fetchEvents: vi.fn(),
  fetchEventById: vi.fn(),
  purchaseEventTicket: vi.fn(),
}));

describe('ClubEventsPage (/events)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/events');
  });

  it('displays the Instagram holding page when no upcoming events exist', async () => {
    vi.mocked(api.fetchEvents).mockResolvedValue([]);

    render(<ClubEventsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('no-events-holding')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/No upcoming events, please check Instagram for more details/i)
    ).toBeInTheDocument();

    const instagramLink = screen.getByRole('link', { name: /@prrcbrentwood/i });
    expect(instagramLink).toHaveAttribute(
      'href',
      'https://www.instagram.com/prrcbrentwood/'
    );
  });

  it('lists upcoming events and shows a countdown when clicking an event whose sale has not started', async () => {
    const futureSale = new Date(Date.now() + 86400 * 1000).toISOString();
    const futureEvent = new Date(Date.now() + 14 * 86400 * 1000).toISOString();

    const eventWithStats = {
      event: {
        id: 'evt_1',
        title: 'PRRC Christmas Party 2026',
        description: 'Annual festive celebration!',
        startDate: futureEvent,
        saleStartAt: futureSale,
        maxTickets: 50,
        ticketPrice: 25,
        address: 'The Brentwood Tap, CM14',
        logoUrl: '',
        fromEmail: 'Peasants Running Club <events@peasants-running-kit.store>',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      isSaleOpen: false,
      isSaleClosed: false,
      ticketsSold: 0,
      ticketsRemaining: 50,
      ticketsCheckedIn: 0,
    };

    vi.mocked(api.fetchEvents).mockResolvedValue([eventWithStats]);

    render(<ClubEventsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('events-list')).toBeInTheDocument();
    });

    expect(screen.getByText('PRRC Christmas Party 2026')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('event-card'));

    await waitFor(() => {
      expect(screen.getByTestId('event-countdown')).toBeInTheDocument();
    });
    expect(screen.getByText(/Countdown to Ticket Release/i)).toBeInTheDocument();
  });

  it('renders the ticket purchase form when sales are open and completes a 1-ticket Monzo checkout', async () => {
    const pastSale = new Date(Date.now() - 3600 * 1000).toISOString();
    const futureEvent = new Date(Date.now() + 14 * 86400 * 1000).toISOString();

    const openEvent = {
      event: {
        id: 'evt_open_1',
        title: 'PRRC Summer Social 2026',
        description: 'Drinks and food after track!',
        startDate: futureEvent,
        saleStartAt: pastSale,
        maxTickets: 50,
        ticketPrice: 20,
        address: 'The Brentwood Tap, CM14',
        logoUrl: '',
        fromEmail: 'Peasants Running Club <events@peasants-running-kit.store>',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      isSaleOpen: true,
      isSaleClosed: false,
      ticketsSold: 4,
      ticketsRemaining: 46,
      ticketsCheckedIn: 0,
    };

    vi.mocked(api.fetchEvents).mockResolvedValue([openEvent]);
    vi.mocked(api.fetchEventById).mockResolvedValue({
      ...openEvent,
      ticketsSold: 5,
      ticketsRemaining: 45,
    });
    vi.mocked(api.purchaseEventTicket).mockResolvedValue({
      id: 'PRRC-EVT-2026-0005',
      eventId: 'evt_open_1',
      eventTitle: 'PRRC Summer Social 2026',
      eventStartDate: futureEvent,
      eventAddress: 'The Brentwood Tap, CM14',
      userName: 'Alice Runner',
      userEmail: 'alice@example.com',
      unitPrice: 20,
      status: 'pending_payment',
      paymentLinkUrl: 'https://monzo.me/rebeccannevarney/20.00?d=PRRC-EVT-2026-0005',
      monzoReference: 'PRRC-EVT-2026-0005',
      ticketUuid: '550e8400-e29b-41d4-a716-446655440000',
      checkedIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    render(<ClubEventsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('event-card')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('event-card'));

    await waitFor(() => {
      expect(screen.getByTestId('event-purchase-form')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'Alice Runner' },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'alice@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Buy Ticket/i }));

    await waitFor(() => {
      expect(screen.getByTestId('ticket-order-confirmation')).toBeInTheDocument();
    });

    expect(screen.getByTestId('ticket-order-reference')).toHaveTextContent(
      'PRRC-EVT-2026-0005'
    );
    expect(api.purchaseEventTicket).toHaveBeenCalledWith('evt_open_1', {
      userName: 'Alice Runner',
      userEmail: 'alice@example.com',
      userId: undefined,
    });
  });

  it('displays error state when loading events fails and allows retrying', async () => {
    vi.mocked(api.fetchEvents).mockRejectedValueOnce(new Error('Network error loading events'));
    vi.mocked(api.fetchEvents).mockResolvedValueOnce([]);

    render(<ClubEventsPage />);

    await waitFor(() => {
      expect(screen.getByText('Network error loading events')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /Back to Events/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByTestId('no-events-holding')).toBeInTheDocument();
    });
  });

  it('displays sold out state when tickets are remaining <= 0', async () => {
    const futureEvent = new Date(Date.now() + 14 * 86400 * 1000).toISOString();
    const pastSale = new Date(Date.now() - 3600 * 1000).toISOString();

    const soldOutEvent = {
      event: {
        id: 'evt_sold_out',
        title: 'PRRC Evening Gala',
        description: 'No tickets left',
        startDate: futureEvent,
        saleStartAt: pastSale,
        maxTickets: 50,
        ticketPrice: 20,
        address: 'Brentwood',
        logoUrl: '',
        fromEmail: 'events@peasants-running-kit.store',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      isSaleOpen: true,
      isSaleClosed: false,
      ticketsSold: 50,
      ticketsRemaining: 0,
      ticketsCheckedIn: 0,
    };

    vi.mocked(api.fetchEvents).mockResolvedValue([soldOutEvent]);

    render(<ClubEventsPage />);

    await waitFor(() => {
      expect(screen.getByText('PRRC Evening Gala')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('event-card'));

    await waitFor(() => {
      expect(screen.getByTestId('event-sold-out')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('event-purchase-form')).not.toBeInTheDocument();

    // Click back to directory
    const backBtn = screen.getByRole('button', { name: /Back to All Events/i });
    fireEvent.click(backBtn);

    await waitFor(() => {
      expect(screen.getByTestId('events-list')).toBeInTheDocument();
    });
  });

  it('validates customer form fields and handles ticket purchase API failure', async () => {
    const futureEvent = new Date(Date.now() + 14 * 86400 * 1000).toISOString();
    const pastSale = new Date(Date.now() - 3600 * 1000).toISOString();

    const eventWithTickets = {
      event: {
        id: 'evt_open_2',
        title: 'PRRC Track Night',
        description: 'Track event',
        startDate: futureEvent,
        saleStartAt: pastSale,
        maxTickets: 50,
        ticketPrice: 15,
        address: 'Brentwood Track',
        logoUrl: '',
        fromEmail: 'events@peasants-running-kit.store',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      isSaleOpen: true,
      isSaleClosed: false,
      ticketsSold: 5,
      ticketsRemaining: 45,
      ticketsCheckedIn: 0,
    };

    vi.mocked(api.fetchEvents).mockResolvedValue([eventWithTickets]);
    vi.mocked(api.purchaseEventTicket).mockRejectedValueOnce(new Error('Payment gateway down'));

    render(<ClubEventsPage />);

    await waitFor(() => {
      expect(screen.getByText('PRRC Track Night')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('event-card'));

    await waitFor(() => {
      expect(screen.getByTestId('event-purchase-form')).toBeInTheDocument();
    });

    const form = screen.getByRole('button', { name: /Buy Ticket/i }).closest('form')!;

    // Try submit empty via form submit
    fireEvent.submit(form);
    await waitFor(() => {
      expect(screen.getByText(/Please enter your full name/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'Bob Runner' },
    });
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'invalidemail' },
    });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
    });

    // Valid inputs, but API fails
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'bob@example.com' },
    });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByTestId('order-failure-alert')).toBeInTheDocument();
      expect(screen.getByText(/Ticket Reservation Failed/i)).toBeInTheDocument();
      expect(screen.getByText(/Payment gateway down/i)).toBeInTheDocument();
      expect(
        screen.getByText(/No payment was taken and no ticket was reserved/i)
      ).toBeInTheDocument();
    });

    // Dismiss failure alert
    fireEvent.click(screen.getByRole('button', { name: /Try Again/i }));
    await waitFor(() => {
      expect(screen.queryByTestId('order-failure-alert')).not.toBeInTheDocument();
    });
  });

  it('displays sales closed state and banner when an event ticket sale closing date has passed', async () => {
    const futureEvent = new Date(Date.now() + 14 * 86400 * 1000).toISOString();
    const pastSaleStart = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
    const pastSaleEnd = new Date(Date.now() - 3600 * 1000).toISOString();

    const closedEvent = {
      event: {
        id: 'evt_closed_1',
        title: 'PRRC Closed Ticket Social',
        description: 'Ticket sales have ended for this event',
        startDate: futureEvent,
        saleStartAt: pastSaleStart,
        saleEndAt: pastSaleEnd,
        maxTickets: 30,
        ticketPrice: 10,
        address: 'Brentwood High Street',
        logoUrl: '',
        fromEmail: 'events@peasants-running-kit.store',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      isSaleOpen: false,
      isSaleClosed: true,
      ticketsSold: 20,
      ticketsRemaining: 10,
      ticketsCheckedIn: 0,
    };

    vi.mocked(api.fetchEvents).mockResolvedValue([closedEvent]);
    vi.mocked(api.fetchEventById).mockResolvedValue(closedEvent);

    render(<ClubEventsPage />);

    await waitFor(() => {
      expect(screen.getByText('PRRC Closed Ticket Social')).toBeInTheDocument();
    });

    // Check that "Sales Closed" badge is visible on the directory card
    expect(screen.getByText('Sales Closed')).toBeInTheDocument();

    // Click event card
    fireEvent.click(screen.getByTestId('event-card'));

    await waitFor(() => {
      expect(screen.getByTestId('event-sales-closed')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('heading', { name: /Ticket Sales for This Event Have Closed/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Online ticket sales closed on/i)
    ).toBeInTheDocument();

    // Reminder details should still be visible
    expect(screen.getByText('Brentwood High Street')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View My Orders/i })).toHaveAttribute(
      'href',
      '/store/orders'
    );

    // Form should not be rendered
    expect(screen.queryByTestId('event-purchase-form')).not.toBeInTheDocument();
  });
});
