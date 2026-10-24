import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminDoorScannerPage from './page';
import * as api from '@/lib/api';

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue('evt_1'),
  }),
}));

vi.mock('@/lib/api', () => ({
  verifyAdminPassword: vi.fn(),
  fetchEvents: vi.fn().mockResolvedValue([]),
  verifyEventTicketQr: vi.fn(),
}));

describe('AdminDoorScannerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('renders password prompt when not authenticated', () => {
    render(<AdminDoorScannerPage />);
    expect(screen.getByText('Door QR Scanner Login')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter admin password')).toBeInTheDocument();
  });

  it('shows error message on incorrect admin password', async () => {
    vi.mocked(api.verifyAdminPassword).mockResolvedValueOnce(false);
    render(<AdminDoorScannerPage />);

    fireEvent.change(screen.getByPlaceholderText('Enter admin password'), {
      target: { value: 'wrongpass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /unlock door scanner/i }));

    expect(await screen.findByText('Incorrect admin password.')).toBeInTheDocument();
  });

  it('unlocks scanner view on valid admin password', async () => {
    vi.mocked(api.verifyAdminPassword).mockResolvedValueOnce(true);
    render(<AdminDoorScannerPage />);

    fireEvent.change(screen.getByPlaceholderText('Enter admin password'), {
      target: { value: 'correctpass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /unlock door scanner/i }));

    await waitFor(() => {
      expect(sessionStorage.getItem('admin_authenticated')).toBe('true');
      expect(screen.getByTestId('door-qr-scanner-screen')).toBeInTheDocument();
    });
  });

  it('auto-authenticates if sessionStorage admin_authenticated is true', async () => {
    sessionStorage.setItem('admin_authenticated', 'true');
    render(<AdminDoorScannerPage />);

    await waitFor(() => {
      expect(screen.getByTestId('door-qr-scanner-screen')).toBeInTheDocument();
    });
  });
});
