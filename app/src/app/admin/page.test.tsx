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
  fetchFeatureFlag: vi.fn().mockResolvedValue({ id: 'store_closed', enabled: false }),
  updateFeatureFlag: vi.fn().mockResolvedValue({ id: 'store_closed', enabled: true }),
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
    {
      id: 'ORD-SENT',
      userName: 'Dana White',
      userEmail: 'dana@example.com',
      status: 'order_sent',
      items: [{ productId: 'p3', productName: 'Running Socks', price: 12, size: 'M', quantity: 2, subtotal: 24 }],
      totalAmount: 24,
      paymentLinkUrl: 'https://monzo.me/test',
      monzoReference: 'ORD-SENT',
      createdAt: '2026-10-10T13:00:00.000Z',
      updatedAt: '2026-10-10T13:00:00.000Z',
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
    const ordersTabButton = await screen.findByRole('button', { name: /Customer Orders \(4\)/i });
    fireEvent.click(ordersTabButton);

    // Verify filter buttons exist
    expect(screen.getByRole('button', { name: /All 4/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pending Payment 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Payment Received 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Order Sent 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Order Fulfilled 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancelled 0/i })).toBeInTheDocument();

    // Verify all 4 orders are displayed initially
    expect(screen.getByText('ORD-PENDING')).toBeInTheDocument();
    expect(screen.getByText('ORD-PAID')).toBeInTheDocument();
    expect(screen.getByText('ORD-SENT')).toBeInTheDocument();
    expect(screen.getByText('ORD-COMPLETED')).toBeInTheDocument();
  });

  it('filters orders by Pending Payment', async () => {
    render(<AdminCMSPage />);

    const ordersTabButton = await screen.findByRole('button', { name: /Customer Orders \(4\)/i });
    fireEvent.click(ordersTabButton);

    const pendingFilterButton = screen.getByRole('button', { name: /Pending Payment 1/i });
    fireEvent.click(pendingFilterButton);

    expect(screen.getByText('ORD-PENDING')).toBeInTheDocument();
    expect(screen.queryByText('ORD-PAID')).not.toBeInTheDocument();
    expect(screen.queryByText('ORD-SENT')).not.toBeInTheDocument();
    expect(screen.queryByText('ORD-COMPLETED')).not.toBeInTheDocument();
  });

  it('filters orders by Payment Received', async () => {
    render(<AdminCMSPage />);

    const ordersTabButton = await screen.findByRole('button', { name: /Customer Orders \(4\)/i });
    fireEvent.click(ordersTabButton);

    const paidFilterButton = screen.getByRole('button', { name: /Payment Received 1/i });
    fireEvent.click(paidFilterButton);

    expect(screen.queryByText('ORD-PENDING')).not.toBeInTheDocument();
    expect(screen.getByText('ORD-PAID')).toBeInTheDocument();
    expect(screen.queryByText('ORD-SENT')).not.toBeInTheDocument();
    expect(screen.queryByText('ORD-COMPLETED')).not.toBeInTheDocument();
  });

  it('filters orders by Order Sent', async () => {
    render(<AdminCMSPage />);

    const ordersTabButton = await screen.findByRole('button', { name: /Customer Orders \(4\)/i });
    fireEvent.click(ordersTabButton);

    const sentFilterButton = screen.getByRole('button', { name: /Order Sent 1/i });
    fireEvent.click(sentFilterButton);

    expect(screen.queryByText('ORD-PENDING')).not.toBeInTheDocument();
    expect(screen.queryByText('ORD-PAID')).not.toBeInTheDocument();
    expect(screen.getByText('ORD-SENT')).toBeInTheDocument();
    expect(screen.queryByText('ORD-COMPLETED')).not.toBeInTheDocument();
  });

  it('filters orders by Order Fulfilled', async () => {
    render(<AdminCMSPage />);

    const ordersTabButton = await screen.findByRole('button', { name: /Customer Orders \(4\)/i });
    fireEvent.click(ordersTabButton);

    const fulfilledFilterButton = screen.getByRole('button', { name: /Order Fulfilled 1/i });
    fireEvent.click(fulfilledFilterButton);

    expect(screen.queryByText('ORD-PENDING')).not.toBeInTheDocument();
    expect(screen.queryByText('ORD-PAID')).not.toBeInTheDocument();
    expect(screen.queryByText('ORD-SENT')).not.toBeInTheDocument();
    expect(screen.getByText('ORD-COMPLETED')).toBeInTheDocument();
  });

  it('allows organiser to mark order as Order Sent', async () => {
    const { updateOrderStatus } = await import('@/lib/api');
    render(<AdminCMSPage />);

    const ordersTabButton = await screen.findByRole('button', { name: /Customer Orders \(4\)/i });
    fireEvent.click(ordersTabButton);

    // Filter to Payment Received order (ORD-PAID)
    const paidFilterButton = screen.getByRole('button', { name: /Payment Received 1/i });
    fireEvent.click(paidFilterButton);

    const markSentButton = screen.getByRole('button', { name: /Mark Order Sent/i });
    fireEvent.click(markSentButton);

    await waitFor(() => {
      expect(updateOrderStatus).toHaveBeenCalledWith('ORD-PAID', 'order_sent');
    });
  });

  it('displays empty state when no orders match selected filter and resets on Show All Orders', async () => {
    render(<AdminCMSPage />);

    const ordersTabButton = await screen.findByRole('button', { name: /Customer Orders \(4\)/i });
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
    expect(screen.getByText('ORD-SENT')).toBeInTheDocument();
    expect(screen.getByText('ORD-COMPLETED')).toBeInTheDocument();
  });

  it('allows organiser to cancel an order after confirmation', async () => {
    const { updateOrderStatus } = await import('@/lib/api');
    window.confirm = vi.fn().mockReturnValue(true);

    render(<AdminCMSPage />);

    const ordersTabButton = await screen.findByRole('button', { name: /Customer Orders \(4\)/i });
    fireEvent.click(ordersTabButton);

    const pendingFilterButton = screen.getByRole('button', { name: /Pending Payment 1/i });
    fireEvent.click(pendingFilterButton);

    const cancelBtn = screen.getByRole('button', { name: /Cancel Order/i });
    fireEvent.click(cancelBtn);

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('ORD-PENDING'));
    await waitFor(() => {
      expect(updateOrderStatus).toHaveBeenCalledWith('ORD-PENDING', 'cancelled');
    });
  });

  it('does not cancel order if confirmation is rejected', async () => {
    const { updateOrderStatus } = await import('@/lib/api');
    window.confirm = vi.fn().mockReturnValue(false);

    render(<AdminCMSPage />);

    const ordersTabButton = await screen.findByRole('button', { name: /Customer Orders \(4\)/i });
    fireEvent.click(ordersTabButton);

    const pendingFilterButton = screen.getByRole('button', { name: /Pending Payment 1/i });
    fireEvent.click(pendingFilterButton);

    const cancelBtn = screen.getByRole('button', { name: /Cancel Order/i });
    fireEvent.click(cancelBtn);

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('ORD-PENDING'));
    expect(updateOrderStatus).not.toHaveBeenCalled();
  });

  it('displays cancelled order with greyed-out styling and without cancellation button', async () => {
    const { fetchOrders } = await import('@/lib/api');
    vi.mocked(fetchOrders).mockResolvedValueOnce([
      {
        id: 'ORD-CANCELLED',
        userName: 'Evan Stone',
        userEmail: 'evan@example.com',
        status: 'cancelled',
        items: [{ productId: 'p1', productName: 'Race Vest', price: 25, size: 'M', quantity: 1, subtotal: 25 }],
        totalAmount: 25,
        paymentLinkUrl: 'https://monzo.me/test',
        monzoReference: 'ORD-CANCELLED',
        createdAt: '2026-10-10T14:00:00.000Z',
        updatedAt: '2026-10-10T14:00:00.000Z',
      },
    ]);

    render(<AdminCMSPage />);

    const ordersTabButton = await screen.findByRole('button', { name: /Customer Orders \(1\)/i });
    fireEvent.click(ordersTabButton);

    expect(screen.getByText('ORD-CANCELLED')).toBeInTheDocument();
    expect(screen.getByText('Order cancelled')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancel Order/i })).not.toBeInTheDocument();

    // Verify greyed out card styling
    const orderCard = screen.getByText('ORD-CANCELLED').closest('.opacity-60');
    expect(orderCard).toBeInTheDocument();
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

  it('displays store status in header and closes the store when confirmed', async () => {
    const { updateFeatureFlag } = await import('@/lib/api');
    window.confirm = vi.fn().mockReturnValue(true);

    render(<AdminCMSPage />);

    await waitFor(() => {
      expect(screen.getByText('Store Open')).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole('button', { name: /close store/i });
    expect(closeBtn).toBeInTheDocument();

    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(updateFeatureFlag).toHaveBeenCalledWith('store_closed', true);
      expect(screen.getByText('Store Closed')).toBeInTheDocument();
    });
  });

  it('displays store closed banner and reopens the store when confirmed', async () => {
    const { fetchFeatureFlag, updateFeatureFlag } = await import('@/lib/api');
    vi.mocked(fetchFeatureFlag).mockResolvedValueOnce({
      id: 'store_closed',
      enabled: true,
      name: 'Store Closed',
      updatedAt: '2026-01-01T00:00:00Z',
    });
    window.confirm = vi.fn().mockReturnValue(true);

    render(<AdminCMSPage />);

    await waitFor(() => {
      expect(screen.getByText('Store Closed')).toBeInTheDocument();
    });

    // Alert banner should also be visible
    expect(screen.getByText(/Store is currently closed:/i)).toBeInTheDocument();

    const reopenBtn = screen.getAllByRole('button', { name: /reopen store/i })[0];
    fireEvent.click(reopenBtn);

    await waitFor(() => {
      expect(updateFeatureFlag).toHaveBeenCalledWith('store_closed', false);
      expect(screen.getByText('Store Open')).toBeInTheDocument();
    });
  });
});

