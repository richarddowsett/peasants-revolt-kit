import { Resend } from 'resend';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import {
  ErrorAlertContext,
  ErrorAlertOutboundPort,
  ErrorAlertResult,
} from '../../../domain/ports/outbound/ErrorAlertOutboundPort';
import {
  DEFAULT_EVENTS_FROM_EMAIL,
  getDefaultEventsFromEmail,
} from '../../../domain/entities/ClubEvent';
import {
  ResendEmailPayload,
  ResendSendResponse,
} from '../email/ResendTicketEmailAdapter';

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const PII_KEY_NAMES = new Set([
  'username',
  'useremail',
  'email',
  'customername',
  'customeremail',
  'name',
  'fullname',
  'password',
  'token',
  'authorization',
]);

const ORDER_BUSINESS_ERROR_MESSAGES = [
  'The store is currently closed for new orders.',
  'Order must contain at least one item.',
  'Customer name is required.',
  'Customer email is required.',
  'A valid customer email is required.',
];

const TICKET_BUSINESS_ERROR_MESSAGES = [
  'Please enter your full name.',
  'Please enter a valid email address.',
  'Event not found.',
  'Ticket sales for this event have not opened yet.',
  'Ticket sales for this event have closed.',
  'This event has already started.',
  'Sorry, this event is sold out!',
];

export interface AlertTaggedError extends Error {
  __alertReported?: boolean;
}

export function markErrorAsAlerted(err: unknown): void {
  if (err && typeof err === 'object') {
    (err as AlertTaggedError).__alertReported = true;
  }
}

export function isErrorAlreadyAlerted(err: unknown): boolean {
  if (err && typeof err === 'object') {
    return Boolean((err as AlertTaggedError).__alertReported);
  }
  return false;
}

export function isOrderBusinessValidationError(message: string): boolean {
  const trimmed = (message || '').trim();
  return ORDER_BUSINESS_ERROR_MESSAGES.some((msg) => trimmed === msg);
}

export function isTicketPurchaseBusinessValidationError(message: string): boolean {
  const trimmed = (message || '').trim();
  return TICKET_BUSINESS_ERROR_MESSAGES.some((msg) => trimmed === msg);
}

export function redactPiiFromText(text: string): string {
  if (!text) return '';
  return text.replace(EMAIL_REGEX, '[REDACTED_EMAIL]');
}

export function redactPiiFromValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (typeof value === 'string') {
    return redactPiiFromText(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactPiiFromValue(item));
  }
  if (typeof value === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (PII_KEY_NAMES.has(key.toLowerCase())) {
        cleaned[key] = '[REDACTED]';
      } else {
        cleaned[key] = redactPiiFromValue(val);
      }
    }
    return cleaned;
  }
  return value;
}

export function redactPiiFromMetadata(
  metadata?: Record<string, unknown>
): Record<string, unknown> {
  if (!metadata) return {};
  return redactPiiFromValue(metadata) as Record<string, unknown>;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export class ErrorObservabilityAdapter implements ErrorAlertOutboundPort {
  private cachedApiKey: string | null = null;
  private secretManagerClient: SecretManagerServiceClient | null = null;

  constructor(
    secretManagerClient?: SecretManagerServiceClient,
    private resendFactory: (apiKey: string) => {
      emails: { send: (payload: ResendEmailPayload) => Promise<ResendSendResponse> };
    } = (apiKey: string) =>
      new Resend(apiKey) as unknown as {
        emails: { send: (payload: ResendEmailPayload) => Promise<ResendSendResponse> };
      }
  ) {
    if (secretManagerClient) {
      this.secretManagerClient = secretManagerClient;
    }
  }

  private getSecretManagerClient(): SecretManagerServiceClient {
    if (!this.secretManagerClient) {
      this.secretManagerClient = new SecretManagerServiceClient();
    }
    return this.secretManagerClient;
  }

  isProductionEnvironment(): boolean {
    const env = (process.env.ENVIRONMENT || process.env.NODE_ENV || '').toLowerCase();
    const project = (process.env.PROJECT_ID || process.env.GCP_PROJECT || '').toLowerCase();
    if (env === 'qa' || project.includes('-qa')) {
      return false;
    }
    return env === 'production' || env === 'prod';
  }

  getAlertRecipientEmail(): string | null {
    const configured = (
      process.env.ALERT_EMAIL ||
      process.env.ALERT_EMAIL_TO ||
      ''
    ).trim();
    return configured || null;
  }

  async resolveResendApiKey(): Promise<string | null> {
    if (this.cachedApiKey) {
      return this.cachedApiKey;
    }

    const projectId =
      process.env.GCP_PROJECT || process.env.PROJECT_ID || 'peasants-running-kit';
    const secretName = process.env.RESEND_SECRET_NAME || 'resend-api-key';
    const secretVersionPath = `projects/${projectId}/secrets/${secretName}/versions/latest`;

    const isEmulator =
      Boolean(process.env.FIRESTORE_EMULATOR_HOST) && !process.env.FORCE_GCP_SECRET_MANAGER;

    if (!isEmulator) {
      try {
        const client = this.getSecretManagerClient();
        const [version] = await client.accessSecretVersion({ name: secretVersionPath });
        const payload = version.payload?.data?.toString('utf8')?.trim();
        if (payload) {
          this.cachedApiKey = payload;
          return payload;
        }
      } catch (err) {
        console.warn(
          `[ErrorObservabilityAdapter] Could not fetch secret '${secretVersionPath}':`,
          (err as Error).message
        );
      }
    }

    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim()) {
      this.cachedApiKey = process.env.RESEND_API_KEY.trim();
      return this.cachedApiKey;
    }

    return null;
  }

  buildAlertEmailHtml(
    context: ErrorAlertContext,
    timestampIso: string,
    redactedMessage: string,
    redactedStack: string | undefined,
    redactedMetadata: Record<string, unknown>
  ): string {
    const metadataJson =
      Object.keys(redactedMetadata).length > 0
        ? JSON.stringify(redactedMetadata, null, 2)
        : 'None';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>[PRRC PROD ALERT] ${escapeHtml(context.category)}</title>
</head>
<body style="margin:0;padding:24px;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;margin:0 auto;background-color:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #fecaca;box-shadow:0 4px 12px rgba(15,23,42,0.06);">
    <tr>
      <td style="background-color:#991b1b;padding:20px 24px;color:#ffffff;">
        <div style="font-size:11px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;color:#fecaca;margin-bottom:4px;">
          Peasants Running Kit &bull; Production Alert
        </div>
        <h1 style="margin:0;font-size:20px;font-weight:900;color:#ffffff;">
          ${escapeHtml(context.category)}: ${escapeHtml(context.operation)}
        </h1>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin-bottom:20px;">
          <tr>
            <td style="padding-bottom:8px;">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#991b1b;">Error Message (PII Redacted)</div>
              <div style="font-size:14px;font-weight:700;color:#0f172a;margin-top:4px;font-family:monospace;word-break:break-word;">${escapeHtml(redactedMessage)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:8px;">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#991b1b;">Timestamp (UTC)</div>
              <div style="font-size:13px;color:#0f172a;margin-top:2px;font-family:monospace;">${escapeHtml(timestampIso)}</div>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:8px;">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#991b1b;">Operation &amp; HTTP Status</div>
              <div style="font-size:13px;color:#0f172a;margin-top:2px;font-family:monospace;">${escapeHtml(context.operation)}${context.httpStatus ? ` (HTTP ${context.httpStatus})` : ''}</div>
            </td>
          </tr>
          <tr>
            <td>
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#991b1b;">Technical Context (PII Redacted)</div>
              <pre style="margin:4px 0 0 0;font-size:12px;color:#0f172a;font-family:monospace;white-space:pre-wrap;word-break:break-word;">${escapeHtml(metadataJson)}</pre>
            </td>
          </tr>
        </table>
        ${
          redactedStack
            ? `<div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#475569;margin-bottom:6px;">Stack Trace</div>
        <pre style="margin:0;padding:12px;background-color:#0f172a;color:#f8fafc;border-radius:8px;font-size:11px;font-family:monospace;white-space:pre-wrap;word-break:break-word;">${escapeHtml(redactedStack)}</pre>`
            : ''
        }
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  async reportError(context: ErrorAlertContext): Promise<ErrorAlertResult> {
    const timestampIso = new Date().toISOString();
    const environment = process.env.ENVIRONMENT || process.env.NODE_ENV || 'development';

    // 1. Emit structured JSON error log for GCP Cloud Logging & Cloud Error Reporting
    // Full details are kept in Cloud Run logs as requested.
    const structuredLogEntry = {
      severity: 'ERROR',
      '@type':
        'type.googleapis.com/google.devtools.clouderrorreporting.v1beta1.ReportedErrorEvent',
      message: context.stack
        ? `[${context.category}] ${context.operation}: ${context.errorMessage}\n${context.stack}`
        : `[${context.category}] ${context.operation}: ${context.errorMessage}`,
      alertCategory: context.category,
      operation: context.operation,
      httpStatus: context.httpStatus || 500,
      environment,
      metadata: context.metadata || {},
      timestamp: timestampIso,
    };

    console.error(JSON.stringify(structuredLogEntry));

    // 2. Only send email notifications in Production
    if (!this.isProductionEnvironment()) {
      return { logged: true, emailSent: false };
    }

    const recipientEmail = this.getAlertRecipientEmail();
    if (!recipientEmail) {
      console.warn(
        '[ErrorObservabilityAdapter] Production error occurred, but no ALERT_EMAIL is configured.'
      );
      return { logged: true, emailSent: false };
    }

    const apiKey = await this.resolveResendApiKey();
    if (!apiKey) {
      console.warn(
        '[ErrorObservabilityAdapter] Production error occurred, but no Resend API key is available to send alert email.'
      );
      return { logged: true, emailSent: false };
    }

    // 3. Strictly redact customer PII (name/email) before constructing outbound alert email
    const redactedMessage = redactPiiFromText(context.errorMessage);
    const redactedStack = context.stack ? redactPiiFromText(context.stack) : undefined;
    const redactedMetadata = redactPiiFromMetadata(context.metadata);

    const html = this.buildAlertEmailHtml(
      context,
      timestampIso,
      redactedMessage,
      redactedStack,
      redactedMetadata
    );

    const fromAddress = getDefaultEventsFromEmail() || DEFAULT_EVENTS_FROM_EMAIL;
    const subject = `[PRRC PROD ALERT] ${context.category}: ${context.operation}`;

    try {
      const resend = this.resendFactory(apiKey);
      const response = await resend.emails.send({
        from: fromAddress,
        to: [recipientEmail],
        subject,
        html,
      });

      if (response?.error) {
        console.error(
          JSON.stringify({
            severity: 'CRITICAL',
            alertCategory: 'ALERT_DELIVERY_FAILURE',
            message: `[ErrorObservabilityAdapter] Resend failed to send alert email: ${
              response.error.message || JSON.stringify(response.error)
            }`,
            timestamp: new Date().toISOString(),
          })
        );
        return { logged: true, emailSent: false };
      }

      const messageId = response?.data?.id || `alert_${Date.now()}`;
      return { logged: true, emailSent: true, messageId };
    } catch (err) {
      console.error(
        JSON.stringify({
          severity: 'CRITICAL',
          alertCategory: 'ALERT_DELIVERY_FAILURE',
          message: `[ErrorObservabilityAdapter] Exception while sending alert email: ${
            (err as Error).message
          }`,
          timestamp: new Date().toISOString(),
        })
      );
      return { logged: true, emailSent: false };
    }
  }
}
