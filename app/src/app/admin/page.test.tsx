import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminCMSPage from './page';

vi.mock('@/lib/api', () => ({
  verifyAdminPassword: vi.fn().mockResolvedValue(true),
  fetchProducts: vi.fn().mockResolvedValue([]),
  saveProduct: vi.fn(),
  deleteProduct: vi.fn(),
  uploadImages: vi.fn(),
  fetchOrders: vi.fn().mockResolvedValue([
    {
      id: 'ORD-PENDING',
      userName: 'Alice Smith',
      userEmail: 'alice@example.com',
      status: 'pending_payment',
      items: [{ productId: 'p1', productName: 'Race Vest', price: 25, size: 'M', quantity: 1, subtotal: 25 }],
      totalAmount: 25,
      paymentLinkUrl: 'https://monzo.me/test',
      monzoReference: 'ORD-PENDING',
      createdAt: '2026-10-10T10:00:00.000Z',
      updatedAt: '2026-10-10T10:00:00.000Z',
    },
    {
      id: 'ORD-PAID',
      userName: 'Bob Jones',
      userEmail: 'bob@example.com',
      status: 'payment_successful',
      items: [{ productId: 'p2', productName: 'Club Hoodie', price: 40, size: 'L', quantity: 1, subtotal: 40 }],
      totalAmount: 40,
      paymentLinkUrl: 'https://monzo.me/test',
      monzoReference: 'ORD-PAID',
      createdAt: '2026-10-10T11:00:00.000Z',
      updatedAt: '2026-10-10T11:00:00.000Z',
    },
    {
      id: 'ORD-COMPLETED',
      userName: 'Charlie Brown',
      userEmail: 'charlie@example.com',
      status: 'completed',
      items: [{ productId: 'p1', productName: 'Race Vest', price: 25, size: 'S', quantity: 1, subtotal: 25 }],
      totalAmount: 25,
      paymentLinkUrl: 'https://monzo.me/test',
      monzoReference: 'ORD-COMPLETED',
      createdAt: '2026-10-10T12:00:00.000Z',
      updatedAt: '2026-10-10T12:00:00.000Z',
    },
  ]),
  updateOrderStatus: vi.fn().mockResolvedValue(true),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('AdminCMSPage - Customer Orders Status Filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.setItem('admin_authenticated', 'true');
  });

  it('renders all orders and status filter buttons with accurate counts', async () => {
    render(<AdminCMSPage />);

    // Switch to Customer Orders tab
    const ordersTabButton = await screen.findByRole('button', { name: /Customer Orders \(3\)/i });
    fireEvent.click(ordersTabButton);

    // Verify filter buttons exist
    expect(screen.getByRole('button', { name: /All 3/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pending Payment 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Payment Received 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Order Fulfilled 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancelled 0/i })).toBeInTheDocument();

    // Verify all 3 orders are displayed initially
    expect(screen.getByText('ORD-PENDING')).toBeInTheDocument();
    expect(screen.getByText('ORD-PAID')).toBeInTheDocument();
    expect(screen.getByText('ORD-COMPLETED')).toBeInTheDocument();
  });

  it('filters orders by Pending Payment', async () => {
    render(<AdminCMSPage />);

    const ordersTabButton = await screen.findByRole('button', { name: /Customer Orders \(3\)/i });
    fireEvent.click(ordersTabButton);

    const pendingFilterButton = screen.getByRole('button', { name: /Pending Payment 1/i });
    fireEvent.click(pendingFilterButton);

    expect(screen.getByText('ORD-PENDING')).toBeInTheDocument();
    expect(screen.queryByText('ORD-PAID')).not.toBeInTheDocument();
    expect(screen.queryByText('ORD-COMPLETED')).not.toBeInTheDocument();
  });

  it('filters orders by Payment Received', async () => {
    render(<AdminCMSPage />);

    const ordersTabButton = await screen.findByRole('button', { name: /Customer Orders \(3\)/i });
    fireEvent.click(ordersTabButton);

    const paidFilterButton = screen.getByRole('button', { name: /Payment Received 1/i });
    fireEvent.click(paidFilterButton);

    expect(screen.queryByText('ORD-PENDING')).not.toBeInTheDocument();
    expect(screen.getByText('ORD-PAID')).toBeInTheDocument();
    expect(screen.queryByText('ORD-COMPLETED')).not.toBeInTheDocument();
  });

  it('filters orders by Order Fulfilled', async () => {
    render(<AdminCMSPage />);

    const ordersTabButton = await screen.findByRole('button', { name: /Customer Orders \(3\)/i });
    fireEvent.click(ordersTabButton);

    const fulfilledFilterButton = screen.getByRole('button', { name: /Order Fulfilled 1/i });
    fireEvent.click(fulfilledFilterButton);

    expect(screen.queryByText('ORD-PENDING')).not.toBeInTheDocument();
    expect(screen.queryByText('ORD-PAID')).not.toBeInTheDocument();
    expect(screen.getByText('ORD-COMPLETED')).toBeInTheDocument();
  });

  it('displays empty state when no orders match selected filter and resets on Show All Orders', async () => {
    render(<AdminCMSPage />);

    const ordersTabButton = await screen.findByRole('button', { name: /Customer Orders \(3\)/i });
    fireEvent.click(ordersTabButton);

    const cancelledFilterButton = screen.getByRole('button', { name: /Cancelled 0/i });
    fireEvent.click(cancelledFilterButton);

    // Empty state should be visible
    expect(screen.getByText('No orders found')).toBeInTheDocument();
    expect(screen.getByText(/There are no orders with status “Cancelled”/i)).toBeInTheDocument();

    // Click Show All Orders
    const showAllButton = screen.getByRole('button', { name: /Show All Orders/i });
    fireEvent.click(showAllButton);

    // All orders visible again
    expect(screen.getByText('ORD-PENDING')).toBeInTheDocument();
    expect(screen.getByText('ORD-PAID')).toBeInTheDocument();
    expect(screen.getByText('ORD-COMPLETED')).toBeInTheDocument();
  });
});
