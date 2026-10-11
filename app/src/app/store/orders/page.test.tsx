import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserOrdersPage from './page';

vi.mock('@/lib/api', () => ({
  fetchOrders: vi.fn().mockResolvedValue([
    {
      id: 'USER-ORD-1',
      userEmail: 'runner@peasants.store',
      userName: 'Runner One',
      status: 'pending_payment',
      items: [{ productId: 'p1', productName: 'Race Vest', price: 25, size: 'M', quantity: 1, subtotal: 25 }],
      totalAmount: 25,
      paymentLinkUrl: 'https://monzo.me/test',
      monzoReference: 'USER-ORD-1',
      createdAt: '2026-10-10T10:00:00.000Z',
      updatedAt: '2026-10-10T10:00:00.000Z',
    },
    {
      id: 'USER-ORD-2',
      userEmail: 'runner@peasants.store',
      userName: 'Runner One',
      status: 'completed',
      items: [{ productId: 'p2', productName: 'Club Cap', price: 15, size: 'One Size', quantity: 1, subtotal: 15 }],
      totalAmount: 15,
      paymentLinkUrl: 'https://monzo.me/test',
      monzoReference: 'USER-ORD-2',
      createdAt: '2026-10-10T11:00:00.000Z',
      updatedAt: '2026-10-10T11:00:00.000Z',
    },
  ]),
}));

vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: { uid: 'u1', email: 'runner@peasants.store' } },
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((auth, cb) => {
    cb({ uid: 'u1', email: 'runner@peasants.store' });
    return () => {};
  }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/components/StoreHeader', () => ({
  default: () => <div data-testid="store-header" />,
}));

describe('UserOrdersPage - Status Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders status filter tabs and filters orders appropriately', async () => {
    render(<UserOrdersPage />);

    // Wait for orders to load
    await waitFor(() => {
      expect(screen.getAllByText('USER-ORD-1').length).toBeGreaterThan(0);
      expect(screen.getByText('USER-ORD-2')).toBeInTheDocument();
    });

    // Check filter pills
    expect(screen.getByRole('button', { name: /All 2/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pending Payment 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Payment Received 0/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Order Fulfilled 1/i })).toBeInTheDocument();

    // Filter by Pending Payment
    fireEvent.click(screen.getByRole('button', { name: /Pending Payment 1/i }));
    expect(screen.getAllByText('USER-ORD-1').length).toBeGreaterThan(0);
    expect(screen.queryByText('USER-ORD-2')).not.toBeInTheDocument();

    // Filter by Payment Received (0 items) -> should show empty state
    fireEvent.click(screen.getByRole('button', { name: /Payment Received 0/i }));
    expect(screen.getByText('No Orders Found')).toBeInTheDocument();
    expect(screen.getByText('No orders match the selected filter.')).toBeInTheDocument();

    // Click Show All Orders
    fireEvent.click(screen.getByRole('button', { name: /Show All Orders/i }));
    expect(screen.getAllByText('USER-ORD-1').length).toBeGreaterThan(0);
    expect(screen.getByText('USER-ORD-2')).toBeInTheDocument();
  });
});
