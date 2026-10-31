import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import {
  ErrorObservabilityAdapter,
  isErrorAlreadyAlerted,
  isOrderBusinessValidationError,
  isTicketPurchaseBusinessValidationError,
  markErrorAsAlerted,
  redactPiiFromMetadata,
  redactPiiFromText,
} from './ErrorObservabilityAdapter';

describe('ErrorObservabilityAdapter & PII Redaction Helpers', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.ENVIRONMENT;
    delete process.env.NODE_ENV;
    delete process.env.PROJECT_ID;
    delete process.env.GCP_PROJECT;
    delete process.env.ALERT_EMAIL;
    delete process.env.ALERT_EMAIL_TO;
    delete process.env.RESEND_API_KEY;
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FORCE_GCP_SECRET_MANAGER;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('PII redaction and business error classification helpers', () => {
    it('redacts email addresses from arbitrary error strings and stack traces', () => {
      const raw =
        'Failed to deliver ticket to runner@example.com or backup_user+1@sub.domain.co.uk';
      expect(redactPiiFromText(raw)).toBe(
        'Failed to deliver ticket to [REDACTED_EMAIL] or [REDACTED_EMAIL]'
      );
      expect(redactPiiFromText('')).toBe('');
    });

    it('recursively redacts PII fields (userName, userEmail, email, name, password) from metadata while preserving technical IDs', () => {
      const metadata = {
        orderId: 'PRRC-0042',
        ticketId: 'PRRC-EVT-2026-0005',
        eventId: 'evt_xmas_2026',
        itemCount: 2,
        totalAmount: 65,
        userName: 'Jane Runner',
        userEmail: 'jane@example.com',
        nested: {
          customerName: 'John Smith',
          customerEmail: 'john@example.com',
          note: 'Contact john@example.com for details',
        },
        items: [
          {
            productId: 'prod_vest',
            size: 'M',
            quantity: 1,
            email: 'hidden@example.com',
          },
        ],
      };

      const redacted = redactPiiFromMetadata(metadata);

      expect(redacted.orderId).toBe('PRRC-0042');
      expect(redacted.ticketId).toBe('PRRC-EVT-2026-0005');
      expect(redacted.eventId).toBe('evt_xmas_2026');
      expect(redacted.itemCount).toBe(2);
      expect(redacted.totalAmount).toBe(65);
      expect(redacted.userName).toBe('[REDACTED]');
      expect(redacted.userEmail).toBe('[REDACTED]');
      expect(redacted.nested).toEqual({
        customerName: '[REDACTED]',
        customerEmail: '[REDACTED]',
        note: 'Contact [REDACTED_EMAIL] for details',
      });
      expect(redacted.items).toEqual([
        {
          productId: 'prod_vest',
          size: 'M',
          quantity: 1,
          email: '[REDACTED]',
        },
      ]);
    });

    it('correctly classifies expected customer business/validation errors vs system errors', () => {
      expect(isOrderBusinessValidationError('Order must contain at least one item.')).toBe(true);
      expect(isOrderBusinessValidationError('Customer name is required.')).toBe(true);
      expect(isOrderBusinessValidationError('The store is currently closed for new orders.')).toBe(
        true
      );
      expect(
        isOrderBusinessValidationError('Failed to persist order to database: Firestore unavailable')
      ).toBe(false);

      expect(isTicketPurchaseBusinessValidationError('Sorry, this event is sold out!')).toBe(true);
      expect(
        isTicketPurchaseBusinessValidationError('Ticket sales for this event have closed.')
      ).toBe(true);
      expect(isTicketPurchaseBusinessValidationError('Please enter your full name.')).toBe(true);
      expect(
        isTicketPurchaseBusinessValidationError(
          'Failed to reserve ticket in database: Transaction aborted'
        )
      ).toBe(false);
    });

    it('marks errors as alerted to prevent duplicate emails for the same thrown exception', () => {
      const err = new Error('Test failure');
      expect(isErrorAlreadyAlerted(err)).toBe(false);
      markErrorAsAlerted(err);
      expect(isErrorAlreadyAlerted(err)).toBe(true);
      expect(isErrorAlreadyAlerted(null)).toBe(false);
    });
  });

  describe('ErrorObservabilityAdapter.reportError', () => {
    it('logs structured JSON with full context and sends a PII-redacted alert email in production', async () => {
      process.env.ENVIRONMENT = 'production';
      process.env.PROJECT_ID = 'peasants-running-kit';
      process.env.ALERT_EMAIL = 'alerts@example.com';
      process.env.FORCE_GCP_SECRET_MANAGER = 'true';

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockAccessSecretVersion = vi.fn().mockResolvedValue([
        {
          payload: {
            data: Buffer.from('re_prod_key_123'),
          },
        },
      ]);
      const mockSend = vi.fn().mockResolvedValue({
        data: { id: 'resend_alert_001' },
        error: null,
      });

      const adapter = new ErrorObservabilityAdapter(
        { accessSecretVersion: mockAccessSecretVersion } as unknown as SecretManagerServiceClient,
        () => ({
          emails: { send: mockSend },
        })
      );

      const result = await adapter.reportError({
        category: 'ORDER_FAILURE',
        operation: 'POST /api/orders',
        errorMessage: 'Firestore write failed for runner@example.com',
        stack: 'Error: Firestore write failed for runner@example.com\n    at createOrder',
        httpStatus: 500,
        metadata: {
          orderId: 'PRRC-0099',
          itemCount: 1,
          userName: 'Alice Runner',
          userEmail: 'runner@example.com',
        },
      });

      expect(result).toEqual({
        logged: true,
        emailSent: true,
        messageId: 'resend_alert_001',
      });

      // 1. Verify Cloud Run structured log retains full details for Cloud Logging
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const loggedJson = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
      expect(loggedJson.severity).toBe('ERROR');
      expect(loggedJson['@type']).toBe(
        'type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent'
      );
      expect(loggedJson.alertCategory).toBe('ORDER_FAILURE');
      expect(loggedJson.operation).toBe('POST /api/orders');
      expect(loggedJson.metadata.userName).toBe('Alice Runner');
      expect(loggedJson.metadata.userEmail).toBe('runner@example.com');

      // 2. Verify outbound Resend alert email strictly redacts PII (name & email)
      expect(mockSend).toHaveBeenCalledTimes(1);
      const emailPayload = mockSend.mock.calls[0][0];
      expect(emailPayload.to).toEqual(['alerts@example.com']);
      expect(emailPayload.subject).toBe('[PRRC PROD ALERT] ORDER_FAILURE: POST /api/orders');
      expect(emailPayload.html).toContain('PRRC-0099');
      expect(emailPayload.html).toContain('[REDACTED_EMAIL]');
      expect(emailPayload.html).toContain('[REDACTED]');
      expect(emailPayload.html).not.toContain('Alice Runner');
      expect(emailPayload.html).not.toContain('runner@example.com');
    });

    it('logs structured JSON but does NOT send alert emails in QA or non-production environments', async () => {
      process.env.ENVIRONMENT = 'qa';
      process.env.PROJECT_ID = 'peasants-running-kit-qa';
      process.env.ALERT_EMAIL = 'alerts@example.com';
      process.env.RESEND_API_KEY = 're_qa_key';

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockSend = vi.fn();

      const adapter = new ErrorObservabilityAdapter(undefined, () => ({
        emails: { send: mockSend },
      }));

      const result = await adapter.reportError({
        category: 'TICKET_FAILURE',
        operation: 'POST /api/events/:id/tickets',
        errorMessage: 'Database connection timeout',
        httpStatus: 500,
        metadata: { eventId: 'evt_1' },
      });

      expect(result).toEqual({ logged: true, emailSent: false });
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('handles missing ALERT_EMAIL or missing Resend API key gracefully in production without throwing', async () => {
      process.env.ENVIRONMENT = 'production';
      process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085';
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const adapter = new ErrorObservabilityAdapter();

      // Missing ALERT_EMAIL
      const resNoEmail = await adapter.reportError({
        category: 'SYSTEM_ERROR',
        operation: 'GET /api/products',
        errorMessage: 'DB error',
      });
      expect(resNoEmail).toEqual({ logged: true, emailSent: false });

      // Present ALERT_EMAIL, missing RESEND_API_KEY
      process.env.ALERT_EMAIL = 'alerts@example.com';
      const resNoKey = await adapter.reportError({
        category: 'SYSTEM_ERROR',
        operation: 'GET /api/products',
        errorMessage: 'DB error',
      });
      expect(resNoKey).toEqual({ logged: true, emailSent: false });
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(consoleWarnSpy).toHaveBeenCalledTimes(2);
    });

    it('catches Resend errors or exceptions when sending an alert email and logs a CRITICAL fallback entry', async () => {
      process.env.ENVIRONMENT = 'production';
      process.env.ALERT_EMAIL = 'alerts@example.com';
      process.env.RESEND_API_KEY = 're_env_key_123';
      process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8085';

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockSendError = vi
        .fn()
        .mockResolvedValueOnce({ data: null, error: { message: 'Quota exceeded' } })
        .mockRejectedValueOnce(new Error('Network socket hang up'));

      const adapter = new ErrorObservabilityAdapter(undefined, () => ({
        emails: { send: mockSendError },
      }));

      const res1 = await adapter.reportError({
        category: 'EMAIL_DELIVERY_FAILURE',
        operation: 'ResendTicketEmailAdapter.sendEventTicketEmail',
        errorMessage: 'Ticket email failed',
      });
      expect(res1).toEqual({ logged: true, emailSent: false });

      const res2 = await adapter.reportError({
        category: 'EMAIL_DELIVERY_FAILURE',
        operation: 'ResendTicketEmailAdapter.sendEventTicketEmail',
        errorMessage: 'Ticket email failed again',
      });
      expect(res2).toEqual({ logged: true, emailSent: false });

      expect(consoleErrorSpy).toHaveBeenCalledTimes(4);
    });
  });
});
