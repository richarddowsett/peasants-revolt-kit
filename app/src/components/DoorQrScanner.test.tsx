import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DoorQrScanner, { playScanFeedbackCue } from './DoorQrScanner';
import * as api from '@/lib/api';

vi.mock('@/lib/api', () => ({
  fetchEvents: vi.fn().mockResolvedValue([
    {
      event: {
        id: 'evt_1',
        title: 'Christmas Party 2026',
      },
      isSaleOpen: true,
      ticketsSold: 10,
      ticketsRemaining: 40,
      ticketsCheckedIn: 2,
    },
  ]),
  verifyEventTicketQr: vi.fn(),
}));

describe('DoorQrScanner & playScanFeedbackCue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('playScanFeedbackCue audio & haptics', () => {
    it('handles vibration and web audio contexts without throwing', () => {
      // Mock navigator.vibrate
      const vibrateMock = vi.fn();
      Object.defineProperty(navigator, 'vibrate', {
        value: vibrateMock,
        configurable: true,
        writable: true,
      });

      // Mock AudioContext
      const mockOsc = {
        type: '',
        frequency: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      const mockGain = {
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };
      function MockAudioContext() {
        return {
          currentTime: 0,
          destination: {},
          createOscillator: () => mockOsc,
          createGain: () => mockGain,
          close: () => Promise.resolve(),
        };
      }

      window.AudioContext = MockAudioContext as unknown as typeof AudioContext;

      playScanFeedbackCue('checked_in_now', true);
      expect(vibrateMock).toHaveBeenCalledWith([80, 40, 140]);

      playScanFeedbackCue('already_checked_in', true);
      expect(vibrateMock).toHaveBeenCalledWith([140, 60, 140]);

      playScanFeedbackCue('not_found', true);
      expect(vibrateMock).toHaveBeenCalledWith([320]);

      // Sound disabled
      playScanFeedbackCue('checked_in_now', false);
    });
  });

  describe('DoorQrScanner component manual verification', () => {
    it('allows entering a ticket code manually and verifying', async () => {
      vi.mocked(api.verifyEventTicketQr).mockResolvedValueOnce({
        valid: true,
        status: 'checked_in_now',
        ticket: {
          id: 'PRRC-EVT-2026-0001',
          eventId: 'evt_1',
          eventTitle: 'Christmas Party 2026',
          eventStartDate: '2026-12-19T20:00:00.000Z',
          eventAddress: 'Brentwood',
          ticketUuid: 'uuid-1234',
          userName: 'Alice Runner',
          userEmail: 'alice@example.com',
          unitPrice: 25,
          status: 'payment_successful',
          monzoReference: 'REF',
          paymentLinkUrl: '',
          checkedIn: true,
          createdAt: '',
          updatedAt: '',
        },
        message: 'Ticket checked in successfully',
      });

      render(<DoorQrScanner initialEventId="evt_1" />);

      await waitFor(() => {
        expect(screen.getByTestId('door-qr-scanner-screen')).toBeInTheDocument();
      });

      const input = screen.getByLabelText('Ticket UUID');
      fireEvent.change(input, { target: { value: 'uuid-1234' } });

      const verifyBtn = screen.getByRole('button', { name: /Verify & Check In/i });
      fireEvent.click(verifyBtn);

      await waitFor(() => {
        expect(api.verifyEventTicketQr).toHaveBeenCalledWith('uuid-1234', 'evt_1');
        expect(screen.getAllByText('Alice Runner').length).toBeGreaterThan(0);
      });
    });

    it('displays error flash when verification fails', async () => {
      vi.mocked(api.verifyEventTicketQr).mockResolvedValueOnce({
        valid: false,
        status: 'not_found',
        message: 'Invalid or forged QR ticket code',
      });

      render(<DoorQrScanner initialEventId="evt_1" />);

      await waitFor(() => {
        expect(screen.getByTestId('door-qr-scanner-screen')).toBeInTheDocument();
      });

      const input = screen.getByLabelText('Ticket UUID');
      fireEvent.change(input, { target: { value: 'fake-code' } });

      const verifyBtn = screen.getByRole('button', { name: /Verify & Check In/i });
      fireEvent.click(verifyBtn);

      await waitFor(() => {
        expect(screen.getByText(/Invalid or forged QR ticket code/i)).toBeInTheDocument();
      });
    });

    it('toggles sound mute button', async () => {
      render(<DoorQrScanner initialEventId="evt_1" />);

      await waitFor(() => {
        expect(screen.getByTestId('door-qr-scanner-screen')).toBeInTheDocument();
      });

      const soundBtn = screen.getByLabelText(/mute scanner audio/i);
      fireEvent.click(soundBtn);

      expect(screen.getByLabelText(/unmute scanner audio/i)).toBeInTheDocument();
    });

    it('resets scan results when Next scan button is clicked', async () => {
      vi.mocked(api.verifyEventTicketQr).mockResolvedValueOnce({
        valid: true,
        status: 'checked_in_now',
        message: 'Entry confirmed',
      });

      render(<DoorQrScanner initialEventId="evt_1" />);

      await waitFor(() => {
        expect(screen.getByTestId('door-qr-scanner-screen')).toBeInTheDocument();
      });

      const input = screen.getByLabelText('Ticket UUID');
      fireEvent.change(input, { target: { value: 'uuid-1234' } });

      fireEvent.click(screen.getByRole('button', { name: /Verify & Check In/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Next/i }));

      await waitFor(() => {
        expect(screen.queryByTestId('qr-scan-result')).not.toBeInTheDocument();
      });
    });

    it('displays camera error message when getUserMedia fails', async () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: {
          getUserMedia: vi.fn().mockRejectedValue(new Error('Camera permission denied')),
        },
        configurable: true,
        writable: true,
      });

      render(<DoorQrScanner initialEventId="evt_1" />);

      await waitFor(() => {
        expect(screen.getByTestId('door-qr-scanner-screen')).toBeInTheDocument();
      });

      const cameraBtn = screen.getByRole('button', { name: /Launch Camera QR Scanner/i });
      fireEvent.click(cameraBtn);

      await waitFor(() => {
        expect(screen.getByText(/Camera permission denied/i)).toBeInTheDocument();
      });
    });
  });
});
