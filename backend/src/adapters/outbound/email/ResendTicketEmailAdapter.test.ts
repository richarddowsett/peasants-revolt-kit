import { describe, it, expect, vi } from 'vitest';
import { ResendTicketEmailAdapter } from './ResendTicketEmailAdapter';
import { Order } from '../../../domain/entities/Order';
import { ChristmasPartySettings } from '../../../domain/entities/ChristmasPartySettings';

describe('ResendTicketEmailAdapter', () => {
  const sampleOrder: Order = {
    id: 'PRRC-XMAS-2026-0001',
    userEmail: 'runner@example.com',
    userName: 'Jane Runner',
    items: [
      {
        productId: 'christmas_party_2026_ticket',
        productName: 'PRRC Christmas Party 2026 Ticket',
        price: 25,
        size: '1 Ticket',
        quantity: 1,
        subtotal: 25,
      },
    ],
    totalAmount: 25,
    status: 'payment_successful',
    paymentLinkUrl: 'https://monzo.me/test/25.00?d=PRRC-XMAS-2026-0001',
    monzoReference: 'PRRC-XMAS-2026-0001',
    orderType: 'christmas_2026_ticket',
    ticketUuid: '123e4567-e89b-12d3-a456-426614174000',
    eventYear: 2026,
    createdAt: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-01T10:05:00.000Z',
  };

  const sampleSettings: ChristmasPartySettings = {
    eventYear: 2026,
    saleStartAt: '2026-11-01T09:00:00.000Z',
    maxTickets: 50,
    ticketPrice: 25,
    partyDateTime: '2026-12-19T19:30:00.000Z',
    partyLocation: 'The Brentwood Tap, CM14',
    fromEmail: 'Peasants Running Club <christmas@peasants-running-kit.store>',
    updatedAt: '2026-10-15T00:00:00.000Z',
  };

  it('fetches the Resend API key from Google Cloud Secret Manager and sends a branded QR email from christmas@peasants-running-kit.store', async () => {
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

    const result = await adapter.sendChristmasPartyTicketEmail(sampleOrder, sampleSettings);

    expect(result.sent).toBe(true);
    expect(result.messageId).toBe('resend_email_999');
    expect(mockAccessSecretVersion).toHaveBeenCalledWith({
      name: expect.stringMatching(/projects\/.*\/secrets\/resend-api-key\/versions\/latest/),
    });
    expect(mockSend).toHaveBeenCalledTimes(1);

    const sentPayload = mockSend.mock.calls[0][0];
    expect(sentPayload.from).toBe('Peasants Running Club <christmas@peasants-running-kit.store>');
    expect(sentPayload.to).toEqual(['runner@example.com']);
    expect(sentPayload.subject).toContain('PRRC-XMAS-2026-0001');
    expect(sentPayload.html).toContain('123e4567-e89b-12d3-a456-426614174000');
    expect(sentPayload.html).toContain('The Brentwood Tap, CM14');
    expect(sentPayload.attachments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          filename: 'ticket-PRRC-XMAS-2026-0001.png',
          contentId: 'ticket-qr',
        }),
      ])
    );

    delete process.env.FORCE_GCP_SECRET_MANAGER;
  });
});
