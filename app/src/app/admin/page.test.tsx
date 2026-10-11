import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminCMSPage from './page';
import { saveProduct } from '@/lib/api';

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

describe('AdminCMSPage - Product Sizing Direct Input (No CMS Defaults or Presets)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.setItem('admin_authenticated', 'true');
    vi.stubGlobal('alert', vi.fn());
  });

  it('starts with empty size table and no preset selector when opening Add New Kit Item modal', async () => {
    render(<AdminCMSPage />);

    const addButton = await screen.findByRole('button', { name: /Add New Kit Item/i });
    fireEvent.click(addButton);

    // Modal opens
    expect(screen.getByRole('heading', { name: 'Add New Product' })).toBeInTheDocument();

    // Verify empty state is displayed
    expect(
      screen.getByText(/No sizes defined\. Click "Add Men's", "Add Women's", or "Add Unisex" above to add sizes\./i)
    ).toBeInTheDocument();

    // Verify presets selector dropdown does NOT exist
    expect(screen.queryByText(/Load Preset\.\.\./i)).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('alerts if attempting to save product without any sizes defined', async () => {
    render(<AdminCMSPage />);

    const addButton = await screen.findByRole('button', { name: /Add New Kit Item/i });
    fireEvent.click(addButton);

    // Fill basic details
    const nameInput = screen.getByPlaceholderText(/e\.g\. Official Club Running Vest/i);
    fireEvent.change(nameInput, { target: { value: 'Test Cap' } });

    // Try saving without sizes
    const form = nameInput.closest('form')!;
    fireEvent.submit(form);

    expect(window.alert).toHaveBeenCalledWith('Please add at least one size for the product.');
    expect(saveProduct).not.toHaveBeenCalled();
  });

  it('allows adding size rows directly and saves them without default fallbacks', async () => {
    (saveProduct as any).mockResolvedValueOnce({ id: 'p-new', name: 'Race Vest' });

    render(<AdminCMSPage />);

    const addButton = await screen.findByRole('button', { name: /Add New Kit Item/i });
    fireEvent.click(addButton);

    // Fill basic details
    const nameInput = screen.getByPlaceholderText(/e\.g\. Official Club Running Vest/i);
    fireEvent.change(nameInput, { target: { value: 'Race Vest' } });

    // Add Men's size row
    const addMensBtn = screen.getByRole('button', { name: /Add Men's/i });
    fireEvent.click(addMensBtn);

    // Empty state should be gone
    expect(
      screen.queryByText(/No sizes defined/i)
    ).not.toBeInTheDocument();

    // Check headers indicate inches (in)
    expect(screen.getByText('Chest / Bust (in)')).toBeInTheDocument();
    expect(screen.getByText('Waist (in)')).toBeInTheDocument();
    expect(screen.getByText('Length / Inseam (in)')).toBeInTheDocument();

    // Fill size label
    const sizeInput = screen.getByPlaceholderText('e.g. S, M, L');
    fireEvent.change(sizeInput, { target: { value: 'M' } });

    // Fill chest measurement in inches
    const chestInput = screen.getByPlaceholderText('e.g. 38 – 40 in');
    fireEvent.change(chestInput, { target: { value: '38 – 40 in' } });

    // Save product
    const form = nameInput.closest('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(saveProduct).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Race Vest',
          sizes: ["Men's M"],
          sizeGuideRows: [
            expect.objectContaining({
              gender: 'men',
              size: 'M',
              chest: '38 – 40 in',
            }),
          ],
        })
      );
    });
  });
});

