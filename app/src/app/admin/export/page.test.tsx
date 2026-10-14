import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ManufacturerExportPage from './page';
import { fetchOrders, updateOrderStatus, verifyAdminPassword } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  verifyAdminPassword: vi.fn(),
  fetchOrders: vi.fn(),
  updateOrderStatus: vi.fn(),
}));

describe('ManufacturerExportPage', () => {
  const mockOrders = [
    {
      id: 'ORD-PAID-1',
      userName: 'Alice Smith',
      userEmail: 'alice@example.com',
      status: 'payment_successful',
      totalAmount: 50,
      paymentLinkUrl: '',
      monzoReference: 'REF1',
      createdAt: '2026-10-10T10:00:00.000Z',
      updatedAt: '2026-10-10T10:00:00.000Z',
      items: [
        { productId: 'p1', productName: 'Running Vest', price: 25, size: "Men's M", quantity: 2, subtotal: 50 },
      ],
    },
    {
      id: 'ORD-PAID-2',
      userName: 'Bob Jones',
      userEmail: 'bob@example.com',
      status: 'payment_successful',
      totalAmount: 65,
      paymentLinkUrl: '',
      monzoReference: 'REF2',
      createdAt: '2026-10-10T11:00:00.000Z',
      updatedAt: '2026-10-10T11:00:00.000Z',
      items: [
        { productId: 'p1', productName: 'Running Vest', price: 25, size: "Women's S", quantity: 1, subtotal: 25 },
        { productId: 'p2', productName: 'Technical T-Shirt', price: 40, size: "Men's L", quantity: 1, subtotal: 40 },
      ],
    },
    {
      id: 'ORD-PENDING',
      userName: 'Charlie Brown',
      userEmail: 'charlie@example.com',
      status: 'pending_payment',
      totalAmount: 25,
      paymentLinkUrl: '',
      monzoReference: 'REF3',
      createdAt: '2026-10-10T12:00:00.000Z',
      updatedAt: '2026-10-10T12:00:00.000Z',
      items: [
        { productId: 'p1', productName: 'Running Vest', price: 25, size: "Men's XL", quantity: 1, subtotal: 25 },
      ],
    },
    {
      id: 'ORD-SENT',
      userName: 'Diana Prince',
      userEmail: 'diana@example.com',
      status: 'order_sent',
      totalAmount: 30,
      paymentLinkUrl: '',
      monzoReference: 'REF4',
      createdAt: '2026-10-09T10:00:00.000Z',
      updatedAt: '2026-10-09T10:00:00.000Z',
      items: [
        { productId: 'p1', productName: 'Running Vest', price: 25, size: "Men's S", quantity: 1, subtotal: 25 },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    (fetchOrders as any).mockResolvedValue(mockOrders);
    (updateOrderStatus as any).mockResolvedValue({ success: true });
    (verifyAdminPassword as any).mockResolvedValue(true);
    window.confirm = vi.fn().mockReturnValue(true);
    window.print = vi.fn();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('renders login prompt when admin is not authenticated', () => {
    render(<ManufacturerExportPage />);
    expect(screen.getByText('Admin Access Required')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter admin password')).toBeInTheDocument();
  });

  it('allows logging in with correct admin password', async () => {
    render(<ManufacturerExportPage />);
    const input = screen.getByPlaceholderText('Enter admin password');
    fireEvent.change(input, { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /Unlock Manufacturer Export/i }));

    await waitFor(() => {
      expect(verifyAdminPassword).toHaveBeenCalledWith('secret');
      expect(screen.getByRole('heading', { name: /Manufacturer Production Order/i })).toBeInTheDocument();
    });
  });

  it('shows error on incorrect admin password', async () => {
    (verifyAdminPassword as any).mockResolvedValueOnce(false);
    render(<ManufacturerExportPage />);
    const input = screen.getByPlaceholderText('Enter admin password');
    fireEvent.change(input, { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /Unlock Manufacturer Export/i }));

    await waitFor(() => {
      expect(screen.getByText('Incorrect admin password.')).toBeInTheDocument();
    });
  });

  it('renders manufacturer sheet with club logo, product tables, and grand total for paid orders', async () => {
    sessionStorage.setItem('admin_authenticated', 'true');
    render(<ManufacturerExportPage />);

    await waitFor(() => {
      expect(fetchOrders).toHaveBeenCalled();
    });

    // Check Header & Logo
    const logoImg = screen.getByAltText('Peasants Revolt Running Club Logo');
    expect(logoImg).toBeInTheDocument();
    expect(logoImg).toHaveAttribute('src', '/logo.png');

    expect(screen.getByRole('heading', { name: /Manufacturer Production Order/i })).toBeInTheDocument();
    expect(screen.getByText('Payment Verified')).toBeInTheDocument();

    // Verify products are rendered (Running Vest and Technical T-Shirt)
    expect(screen.getByText('Running Vest')).toBeInTheDocument();
    expect(screen.getByText('Technical T-Shirt')).toBeInTheDocument();

    // Verify Gender breakdown
    expect(screen.getAllByText("Men's").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Women's").length).toBeGreaterThanOrEqual(1);

    // Verify Pending order (Men's XL) is NOT included in default paid export
    expect(screen.queryByText('XL')).not.toBeInTheDocument();

    // Verify Grand Total:
    // Total garments: 2 (vest) + 1 (vest) + 1 (tee) = 4 units
    // Total value: 50 + 25 + 40 = £115.00
    expect(screen.getByText('Grand Total Batch')).toBeInTheDocument();
    expect(screen.getAllByText('£115.00').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Total Quantity')).toBeInTheDocument();
    expect(screen.getAllByText(/items/i).length).toBeGreaterThanOrEqual(1);
  });

  it('displays red error labels and disables export buttons when mandatory fields are empty', async () => {
    sessionStorage.setItem('admin_authenticated', 'true');
    render(<ManufacturerExportPage />);
    await waitFor(() => {
      expect(screen.getByText('Running Vest')).toBeInTheDocument();
    });

    // Both error labels should be visible initially
    expect(screen.getByTestId('admin-email-error')).toHaveTextContent('Club admin email is required');
    expect(screen.getByTestId('shipping-address-error')).toHaveTextContent('Shipping address is required');

    // Print button should be disabled
    const printButton = screen.getByRole('button', { name: /Print \/ Save as PDF/i });
    expect(printButton).toBeDisabled();

    // Mark as Sent button should be disabled
    const markSentButton = screen.getByRole('button', { name: /Mark 2 as Sent/i });
    expect(markSentButton).toBeDisabled();

    // Fill in only email
    const emailInput = screen.getByPlaceholderText('e.g. admin@peasantsrc.co.uk');
    fireEvent.change(emailInput, { target: { value: 'admin@peasantsrc.co.uk' } });

    // Email error is gone, address error still remains, print still disabled
    expect(screen.queryByTestId('admin-email-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('shipping-address-error')).toBeInTheDocument();
    expect(printButton).toBeDisabled();

    // Fill in shipping address
    const addressInput = screen.getByPlaceholderText('Enter shipping address...');
    fireEvent.change(addressInput, { target: { value: '123 Club Street, London' } });

    // Both errors are gone and print button is enabled
    expect(screen.queryByTestId('admin-email-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('shipping-address-error')).not.toBeInTheDocument();
    expect(printButton).not.toBeDisabled();
    expect(markSentButton).not.toBeDisabled();
  });

  it('triggers window.print when Print / Save as PDF is clicked after mandatory fields are completed', async () => {
    sessionStorage.setItem('admin_authenticated', 'true');
    render(<ManufacturerExportPage />);
    await waitFor(() => {
      expect(screen.getByText('Running Vest')).toBeInTheDocument();
    });

    const emailInput = screen.getByPlaceholderText('e.g. admin@peasantsrc.co.uk');
    fireEvent.change(emailInput, { target: { value: 'admin@peasantsrc.co.uk' } });

    const addressInput = screen.getByPlaceholderText('Enter shipping address...');
    fireEvent.change(addressInput, { target: { value: '123 Club Street, London' } });

    const printButton = screen.getByRole('button', { name: /Print \/ Save as PDF/i });
    expect(printButton).not.toBeDisabled();
    fireEvent.click(printButton);

    expect(window.print).toHaveBeenCalled();
  });

  it('marks paid orders as Order Sent when action button is confirmed and mandatory fields are completed', async () => {
    sessionStorage.setItem('admin_authenticated', 'true');
    render(<ManufacturerExportPage />);
    await waitFor(() => {
      expect(screen.getByText('Running Vest')).toBeInTheDocument();
    });

    const emailInput = screen.getByPlaceholderText('e.g. admin@peasantsrc.co.uk');
    fireEvent.change(emailInput, { target: { value: 'admin@peasantsrc.co.uk' } });

    const addressInput = screen.getByPlaceholderText('Enter shipping address...');
    fireEvent.change(addressInput, { target: { value: '123 Club Street, London' } });

    const markSentButton = screen.getByRole('button', { name: /Mark 2 as Sent/i });
    expect(markSentButton).not.toBeDisabled();
    fireEvent.click(markSentButton);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalled();
      expect(updateOrderStatus).toHaveBeenCalledWith('ORD-PAID-1', 'order_sent');
      expect(updateOrderStatus).toHaveBeenCalledWith('ORD-PAID-2', 'order_sent');
      expect(screen.getByText(/Successfully marked 2 order\(s\) as "Order Sent"!/i)).toBeInTheDocument();
    });
  });

  it('marks paid orders as Order Sent with batch reference when batchRef is provided', async () => {
    sessionStorage.setItem('admin_authenticated', 'true');
    render(<ManufacturerExportPage />);
    await waitFor(() => {
      expect(screen.getByText('Running Vest')).toBeInTheDocument();
    });

    const emailInput = screen.getByPlaceholderText('e.g. admin@peasantsrc.co.uk');
    fireEvent.change(emailInput, { target: { value: 'admin@peasantsrc.co.uk' } });

    const addressInput = screen.getByPlaceholderText('Enter shipping address...');
    fireEvent.change(addressInput, { target: { value: '123 Club Street, London' } });

    const batchRefInput = screen.getByLabelText('Batch Reference');
    fireEvent.change(batchRefInput, { target: { value: 'PRRC-SHIP-2026' } });

    // Verify printable batch ref updates to user input
    expect(screen.getByText('PRRC-SHIP-2026')).toBeInTheDocument();

    const markSentButton = screen.getByRole('button', { name: /Mark 2 as Sent/i });
    expect(markSentButton).not.toBeDisabled();
    fireEvent.click(markSentButton);

    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining('PRRC-SHIP-2026')
      );
      expect(updateOrderStatus).toHaveBeenCalledWith('ORD-PAID-1', 'order_sent', 'PRRC-SHIP-2026');
      expect(updateOrderStatus).toHaveBeenCalledWith('ORD-PAID-2', 'order_sent', 'PRRC-SHIP-2026');
      expect(
        screen.getByText(/Successfully marked 2 order\(s\) as "Order Sent" \(Batch: PRRC-SHIP-2026\)!/i)
      ).toBeInTheDocument();
    });
  });

  it('includes previously sent orders when the toggle is checked', async () => {
    sessionStorage.setItem('admin_authenticated', 'true');
    render(<ManufacturerExportPage />);

    await waitFor(() => {
      expect(screen.getByText('Running Vest')).toBeInTheDocument();
    });

    // Before toggle, only 1 'S' size (Women's S from ORD-PAID-2)
    expect(screen.getAllByText('S')).toHaveLength(1);

    // Toggle "Include previously Order Sent orders"
    const checkbox = screen.getByRole('checkbox', {
      name: /Include previously “Order Sent” orders in this sheet/i,
    });
    fireEvent.click(checkbox);

    // Now ORD-SENT is included as well (has Men's S vest), so there are 2 rows with size 'S'
    await waitFor(() => {
      expect(screen.getAllByText('S')).toHaveLength(2);
    });
  });

  it('displays empty state when there are no paid orders', async () => {
    sessionStorage.setItem('admin_authenticated', 'true');
    (fetchOrders as any).mockResolvedValueOnce([
      {
        id: 'ORD-PENDING-ONLY',
        userName: 'Pending User',
        userEmail: 'pending@example.com',
        status: 'pending_payment',
        totalAmount: 25,
        paymentLinkUrl: '',
        monzoReference: 'REF',
        createdAt: '2026-10-10',
        updatedAt: '2026-10-10',
        items: [{ productId: 'p1', productName: 'Vest', price: 25, size: 'M', quantity: 1, subtotal: 25 }],
      },
    ]);

    render(<ManufacturerExportPage />);

    await waitFor(() => {
      expect(screen.getByText('No Orders Ready for Export')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Go to Customer Orders/i })).toBeInTheDocument();
    });
  });

  it('allows customizing the club admin email and renders it in print text', async () => {
    sessionStorage.setItem('admin_authenticated', 'true');
    render(<ManufacturerExportPage />);

    await waitFor(() => {
      expect(screen.getByText('Running Vest')).toBeInTheDocument();
    });

    const emailInput = screen.getByPlaceholderText('e.g. admin@peasantsrc.co.uk');
    expect(emailInput).toHaveValue('');

    fireEvent.change(emailInput, { target: { value: 'kit-officer@peasantsrc.org' } });
    expect(emailInput).toHaveValue('kit-officer@peasantsrc.org');
    expect(screen.getByText('kit-officer@peasantsrc.org')).toBeInTheDocument();
  });

  it('allows customizing the shipping address and renders it in print text', async () => {
    sessionStorage.setItem('admin_authenticated', 'true');
    render(<ManufacturerExportPage />);

    await waitFor(() => {
      expect(screen.getByText('Running Vest')).toBeInTheDocument();
    });

    const addressInput = screen.getByPlaceholderText('Enter shipping address...');
    expect(addressInput).toHaveValue('');

    fireEvent.change(addressInput, {
      target: { value: 'Peasants RC Depot\nUnit 4, Industrial Park\nLondon EC1A 1BB' },
    });
    expect(addressInput).toHaveValue(
      'Peasants RC Depot\nUnit 4, Industrial Park\nLondon EC1A 1BB'
    );
    expect(
      screen.getAllByText(/Unit 4, Industrial Park/).length
    ).toBeGreaterThanOrEqual(1);
  });

  it('does not display any signature boxes or lines at the bottom of the sheet', async () => {
    sessionStorage.setItem('admin_authenticated', 'true');
    render(<ManufacturerExportPage />);

    await waitFor(() => {
      expect(screen.getByText('Running Vest')).toBeInTheDocument();
    });

    expect(screen.queryByText(/Authorized Club Representative/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Manufacturer Production Acknowledgment/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Signature$/i)).not.toBeInTheDocument();
  });

  it('does not display production and packaging notes box', async () => {
    sessionStorage.setItem('admin_authenticated', 'true');
    render(<ManufacturerExportPage />);

    await waitFor(() => {
      expect(screen.getByText('Running Vest')).toBeInTheDocument();
    });

    expect(screen.queryByText(/Production & Packaging Notes/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Add specific instructions for the manufacturer/i)).not.toBeInTheDocument();
  });
});
