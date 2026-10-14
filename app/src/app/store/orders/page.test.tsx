import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserOrdersPage from './page';
import { fetchOrders, lookupOrder } from '@/lib/api';
import { onAuthStateChanged } from 'firebase/auth';
import { useSearchParams } from 'next/navigation';

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  fetchOrders: vi.fn(),
  lookupOrder: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: null },
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/components/StoreHeader', () => ({
  default: ({ onOpenLogin }: any) => (
    <div data-testid="store-header">
      <button onClick={onOpenLogin}>Header Sign In</button>
    </div>
  ),
}));

vi.mock('@/components/StoreLoginScreen', () => ({
  default: ({ onClose }: any) => (
    <div data-testid="store-login-modal">
      <span>Store Login Modal</span>
      <button onClick={onClose}>Close Login Modal</button>
    </div>
  ),
}));

describe('UserOrdersPage', () => {
  const mockMemberOrders = [
    {
      id: 'USER-ORD-1',
      userEmail: 'runner@peasants.store',
      userName: 'Runner One',
      status: 'pending_payment' as const,
      items: [{ productId: 'p1', productName: 'Race Vest', price: 25, size: 'M', quantity: 1, subtotal: 25 }],
      totalAmount: 25,
      paymentLinkUrl: 'https://monzo.me/pay/USER-ORD-1?amount=25',
      monzoReference: 'USER-ORD-1',
      createdAt: '2026-10-10T10:00:00.000Z',
      updatedAt: '2026-10-10T10:00:00.000Z',
    },
    {
      id: 'USER-ORD-2',
      userEmail: 'runner@peasants.store',
      userName: 'Runner One',
      status: 'completed' as const,
      items: [{ productId: 'p2', productName: 'Club Cap', price: 15, size: 'One Size', quantity: 1, subtotal: 15 }],
      totalAmount: 15,
      paymentLinkUrl: 'https://monzo.me/pay/USER-ORD-2?amount=15',
      monzoReference: 'USER-ORD-2',
      createdAt: '2026-10-10T11:00:00.000Z',
      updatedAt: '2026-10-10T11:00:00.000Z',
    },
    {
      id: 'USER-ORD-3',
      userEmail: 'runner@peasants.store',
      userName: 'Runner One',
      status: 'order_sent' as const,
      items: [{ productId: 'p3', productName: 'Race Shorts', price: 30, size: 'M', quantity: 1, subtotal: 30 }],
      totalAmount: 30,
      paymentLinkUrl: 'https://monzo.me/pay/USER-ORD-3?amount=30',
      monzoReference: 'USER-ORD-3',
      createdAt: '2026-10-10T12:00:00.000Z',
      updatedAt: '2026-10-10T12:00:00.000Z',
    },
  ];

  const mockGuestOrder = {
    id: 'PRRC-4321',
    userEmail: 'guestrunner@example.com',
    userName: 'Guest Runner',
    status: 'pending_payment' as const,
    items: [{ productId: 'p1', productName: 'Race Vest', price: 25, size: 'L', quantity: 2, subtotal: 50 }],
    totalAmount: 50,
    paymentLinkUrl: 'https://monzo.me/pay/PRRC-4321?amount=50',
    monzoReference: 'PRRC-4321',
    createdAt: '2026-10-11T09:00:00.000Z',
    updatedAt: '2026-10-11T09:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn().mockReturnValue(null),
    } as any);
  });

  describe('When user is authenticated', () => {
    beforeEach(() => {
      vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback: any) => {
        callback({ uid: 'u1', email: 'runner@peasants.store' });
        return () => {};
      });
      vi.mocked(fetchOrders).mockResolvedValue(mockMemberOrders);
    });

    it('renders member orders with status filter tabs and filters appropriately', async () => {
      render(<UserOrdersPage />);

      await waitFor(() => {
        expect(screen.getAllByText('USER-ORD-1').length).toBeGreaterThan(0);
        expect(screen.getByText('USER-ORD-2')).toBeInTheDocument();
        expect(screen.getByText('USER-ORD-3')).toBeInTheDocument();
      });

      // Status filters
      expect(screen.getByRole('button', { name: /All 3/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Pending Payment 1/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Payment Received 0/i })).toBeInTheDocument();

      // Filter to Pending Payment
      fireEvent.click(screen.getByRole('button', { name: /Pending Payment 1/i }));
      expect(screen.getAllByText('USER-ORD-1').length).toBeGreaterThan(0);
      expect(screen.getByText('Awaiting Payment Confirmation')).toBeInTheDocument();
      expect(screen.queryByText('USER-ORD-2')).not.toBeInTheDocument();
      expect(screen.queryByText('USER-ORD-3')).not.toBeInTheDocument();

      // Filter to 0 matches
      fireEvent.click(screen.getByRole('button', { name: /Payment Received 0/i }));
      expect(screen.getByText('No Orders Found')).toBeInTheDocument();
      expect(screen.getByText('No orders match the selected filter.')).toBeInTheDocument();

      // Reset
      fireEvent.click(screen.getByRole('button', { name: /Show All Orders/i }));
      expect(screen.getAllByText('USER-ORD-1').length).toBeGreaterThan(0);
      expect(screen.getByText('USER-ORD-2')).toBeInTheDocument();
      expect(screen.getByText('USER-ORD-3')).toBeInTheDocument();
    });

    it('renders cancelled orders with greyed-out styling and cancellation message', async () => {
      vi.mocked(fetchOrders).mockResolvedValueOnce([
        {
          id: 'USER-ORD-CANCELLED',
          userEmail: 'runner@peasants.store',
          userName: 'Runner One',
          status: 'cancelled' as const,
          items: [{ productId: 'p1', productName: 'Race Vest', price: 25, size: 'M', quantity: 1, subtotal: 25 }],
          totalAmount: 25,
          paymentLinkUrl: 'https://monzo.me/pay/USER-ORD-CANCELLED?amount=25',
          monzoReference: 'USER-ORD-CANCELLED',
          createdAt: '2026-10-10T10:00:00.000Z',
          updatedAt: '2026-10-10T10:00:00.000Z',
        },
      ]);

      render(<UserOrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('USER-ORD-CANCELLED')).toBeInTheDocument();
      });

      expect(screen.getAllByText('Cancelled').length).toBeGreaterThan(0);
      expect(screen.getByText('This order has been cancelled.')).toBeInTheDocument();
      expect(screen.queryByText(/Pay via Monzo/i)).not.toBeInTheDocument();

      const card = screen.getByText('USER-ORD-CANCELLED').closest('.opacity-60');
      expect(card).toBeInTheDocument();
    });
  });

  describe('When user is NOT authenticated (Guest view)', () => {
    beforeEach(() => {
      vi.mocked(onAuthStateChanged).mockImplementation((_auth, callback: any) => {
        callback(null);
        return () => {};
      });
    });

    it('renders the Track Order Status form and Club Member Sign In card', async () => {
      render(<UserOrdersPage />);

      await waitFor(() => {
        expect(screen.getByText('Track Order Status')).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/Order Number \/ Reference/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Check Order Status/i })).toBeInTheDocument();
      expect(screen.getByText('Club Member Sign In')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign In as Club Member/i })).toBeInTheDocument();
    });

    it('allows a guest to look up their order by reference and email successfully', async () => {
      vi.mocked(lookupOrder).mockResolvedValueOnce(mockGuestOrder);

      render(<UserOrdersPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Order Number \/ Reference/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Order Number \/ Reference/i), {
        target: { value: 'PRRC-4321' },
      });
      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: 'guestrunner@example.com' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Check Order Status/i }));

      await waitFor(() => {
        expect(lookupOrder).toHaveBeenCalledWith('PRRC-4321', 'guestrunner@example.com');
        expect(screen.getAllByText('PRRC-4321').length).toBeGreaterThan(0);
      });

      expect(screen.getByText('Awaiting Payment Confirmation')).toBeInTheDocument();
      expect(screen.getByText(/Guest Runner/i)).toBeInTheDocument();
      expect(screen.getByText(/2x/i)).toBeInTheDocument();
      expect(screen.getByText(/Race Vest \(L\)/i)).toBeInTheDocument();
      expect(screen.getByText('Total: £50.00')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Pay via Monzo/i })).toHaveAttribute(
        'href',
        'https://monzo.me/pay/PRRC-4321?amount=50'
      );

      // Can reset to look up another order
      fireEvent.click(screen.getByRole('button', { name: /Look up another order/i }));
      expect(screen.getByText('Track Order Status')).toBeInTheDocument();
    });

    it('shows error banner when order lookup fails or is not found', async () => {
      vi.mocked(lookupOrder).mockRejectedValueOnce(
        new Error('No order found matching that reference and email.')
      );

      render(<UserOrdersPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/Order Number \/ Reference/i)).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Order Number \/ Reference/i), {
        target: { value: 'PRRC-9999' },
      });
      fireEvent.change(screen.getByLabelText(/Email Address/i), {
        target: { value: 'wrong@example.com' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Check Order Status/i }));

      await waitFor(() => {
        expect(
          screen.getByText('No order found matching that reference and email.')
        ).toBeInTheDocument();
      });
    });

    it('automatically looks up order when ref and email URL search parameters are present', async () => {
      vi.mocked(useSearchParams).mockReturnValue({
        get: (param: string) => {
          if (param === 'ref') return 'PRRC-4321';
          if (param === 'email') return 'guestrunner@example.com';
          return null;
        },
      } as any);

      vi.mocked(lookupOrder).mockResolvedValueOnce(mockGuestOrder);

      render(<UserOrdersPage />);

      await waitFor(() => {
        expect(lookupOrder).toHaveBeenCalledWith('PRRC-4321', 'guestrunner@example.com');
        expect(screen.getAllByText('PRRC-4321').length).toBeGreaterThan(0);
        expect(screen.getByText('Order Found')).toBeInTheDocument();
      });
    });

    it('opens login modal when clicking Sign In as Club Member', async () => {
      render(<UserOrdersPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Sign In as Club Member/i })).toBeInTheDocument();
      });

      expect(screen.queryByTestId('store-login-modal')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Sign In as Club Member/i }));

      expect(screen.getByTestId('store-login-modal')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Close Login Modal'));
      expect(screen.queryByTestId('store-login-modal')).not.toBeInTheDocument();
    });
  });
});
