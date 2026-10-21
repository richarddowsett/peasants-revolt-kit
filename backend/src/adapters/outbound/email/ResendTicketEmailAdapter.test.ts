import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ResendTicketEmailAdapter } from './ResendTicketEmailAdapter';
import { ClubEvent, EventTicket } from '../../../domain/entities/ClubEvent';

describe('ResendTicketEmailAdapter', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.EVENTS_EMAIL_FROM;
    delete process.env.ENVIRONMENT;
    delete process.env.PROJECT_ID;
    delete process.env.GCP_PROJECT;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  const sampleTicket: EventTicket = {
    id: 'PRRC-EVT-2026-0001',
    eventId: 'evt_xmas_2026',
    eventTitle: 'PRRC Christmas Party 2026',
    eventStartDate: '2026-12-19T19:30:00.000Z',
    eventAddress: 'The Brentwood Tap, CM14',
    userEmail: 'runner@example.com',
    userName: 'Jane Runner',
    unitPrice: 25,
    status: 'payment_successful',
    paymentLinkUrl: 'https://monzo.me/test/25.00?d=PRRC-EVT-2026-0001',
    monzoReference: 'PRRC-EVT-2026-0001',
    ticketUuid: '123e4567-e89b-12d3-a456-426614174000',
    checkedIn: false,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:05:00.000Z',
  };

  const sampleEvent: ClubEvent = {
    id: 'evt_xmas_2026',
    title: 'PRRC Christmas Party 2026',
    description: 'Annual festive celebration!',
    startDate: '2026-12-19T19:30:00.000Z',
    saleStartAt: '2026-11-01T09:00:00.000Z',
    maxTickets: 50,
    ticketPrice: 25,
    address: 'The Brentwood Tap, CM14',
    logoUrl: '',
    fromEmail: 'Peasants Running Club <events@peasants-running-kit.store>',
    createdAt: '2026-10-15T00:00:00.000Z',
    updatedAt: '2026-10-15T00:00:00.000Z',
  };

  it('fetches the Resend API key from Google Cloud Secret Manager and sends a branded QR email from events@peasants-running-kit.store', async () => {
    process.env.FORCE_GCP_SECRET_MANAGER = 'true';
    const mockAccessSecretVersion = vi.fn().mockResolvedValue([
      {
        payload: {
          data: Buffer.from('re_secret_manager_key_123'),
        },
      },
    ]);

    const mockSend = vi.fn().mockResolvedValue({
      data: { id: 'resend_email_999' },
      error: null,
    });

    const adapter = new ResendTicketEmailAdapter(
      { accessSecretVersion: mockAccessSecretVersion } as any,
      (apiKey: string) => {
        expect(apiKey).toBe('re_secret_manager_key_123');
        return {
          emails: { send: mockSend },
        };
      }
    );

    const result = await adapter.sendEventTicketEmail(sampleTicket, sampleEvent);

    expect(result.sent).toBe(true);
    expect(result.messageId).toBe('resend_email_999');
    expect(mockAccessSecretVersion).toHaveBeenCalledWith({
      name: expect.stringMatching(/projects\/.*\/secrets\/resend-api-key\/versions\/latest/),
    });
    expect(mockSend).toHaveBeenCalledTimes(1);

    const sentPayload = mockSend.mock.calls[0][0];
    expect(sentPayload.from).toBe('Peasants Running Club <events@peasants-running-kit.store>');
    expect(sentPayload.to).toEqual(['runner@example.com']);
    expect(sentPayload.subject).toContain('PRRC-EVT-2026-0001');
    expect(sentPayload.html).toContain('123e4567-e89b-12d3-a456-426614174000');
    expect(sentPayload.html).toContain('The Brentwood Tap, CM14');
    expect(sentPayload.attachments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          filename: 'ticket-PRRC-EVT-2026-0001.png',
          contentId: 'ticket-qr',
        }),
      ])
    );

    delete process.env.FORCE_GCP_SECRET_MANAGER;
  });

  it('uses eventsqa@peasants-running-kit.store as the sender when running in QA and embeds custom logoUrl when provided', async () => {
    process.env.ENVIRONMENT = 'qa';
    process.env.FORCE_GCP_SECRET_MANAGER = 'true';

    const mockAccessSecretVersion = vi.fn().mockResolvedValue([
      {
        payload: {
          data: Buffer.from('re_qa_key_456'),
        },
      },
    ]);

    const mockSend = vi.fn().mockResolvedValue({
      data: { id: 'resend_qa_email_1' },
      error: null,
    });

    const adapter = new ResendTicketEmailAdapter(
      { accessSecretVersion: mockAccessSecretVersion } as any,
      () => ({
        emails: { send: mockSend },
      })
    );

    const customLogoEvent: ClubEvent = {
      ...sampleEvent,
      logoUrl: 'https://storage.googleapis.com/peasants-running-kit/custom-event-logo.png',
    };

    const result = await adapter.sendEventTicketEmail(sampleTicket, customLogoEvent);

    expect(result.sent).toBe(true);
    const sentPayload = mockSend.mock.calls[0][0];
    expect(sentPayload.from).toBe(
      'Peasants Running Club <eventsqa@peasants-running-kit.store>'
    );
    expect(sentPayload.html).toContain(
      'https://storage.googleapis.com/peasants-running-kit/custom-event-logo.png'
    );

    delete process.env.ENVIRONMENT;
    delete process.env.FORCE_GCP_SECRET_MANAGER;
  });
});
