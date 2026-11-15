import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AdminDoorScannerPage from './page';
import * as api from '@/lib/api';
import {
  ADMIN_AUTH_STORAGE_KEY,
  ADMIN_TOKEN_STORAGE_KEY,
  ApiError,
} from '@/lib/adminSession';

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

  it('logs out, deletes bearer token, and returns to login screen when QR verification returns 401', async () => {
    sessionStorage.setItem(ADMIN_AUTH_STORAGE_KEY, 'true');
    sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, 'expired.bearer.token');
    vi.mocked(api.verifyEventTicketQr).mockRejectedValueOnce(new ApiError('Unauthorized', 401));

    render(<AdminDoorScannerPage />);

    const uuidInput = await screen.findByPlaceholderText('Paste or scan Ticket UUID...');
    fireEvent.change(uuidInput, { target: { value: 'ticket-uuid-123' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify & Check In/i }));

    await waitFor(() => {
      expect(screen.getByText('Door QR Scanner Login')).toBeInTheDocument();
      expect(screen.getByText('Your session has expired. Please log in again.')).toBeInTheDocument();
    });

    expect(sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)).toBeNull();
    expect(sessionStorage.getItem(ADMIN_AUTH_STORAGE_KEY)).toBeNull();
  });
});
