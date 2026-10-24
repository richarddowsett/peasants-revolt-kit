import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { Resend } from 'resend';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { EmailOutboundPort } from '../../../domain/ports/outbound/EmailOutboundPort';
import {
  ClubEvent,
  DEFAULT_EVENTS_FROM_EMAIL,
  EventTicket,
  getDefaultEventsFromEmail,
  isQaEnvironment,
} from '../../../domain/entities/ClubEvent';

export interface ResendEmailPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentId?: string;
  }>;
}

export interface ResendSendResponse {
  data?: { id?: string } | null;
  error?: { message?: string } | null;
}

export class ResendTicketEmailAdapter implements EmailOutboundPort {
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
          `[Secret Manager notice] Could not fetch secret '${secretVersionPath}':`,
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

  private loadClubLogoBuffer(): Buffer | null {
    const candidatePaths = [
      path.resolve(__dirname, '../../../../assets/logo.png'),
      path.resolve(__dirname, '../../../../../app/public/logo.png'),
      path.resolve(process.cwd(), 'assets/logo.png'),
      path.resolve(process.cwd(), '../app/public/logo.png'),
    ];
    for (const candidate of candidatePaths) {
      try {
        if (fs.existsSync(candidate)) {
          return fs.readFileSync(candidate);
        }
      } catch {
        // Ignore read error and try next path
      }
    }
    return null;
  }

  private formatEventDateTime(isoOrDateStr: string): string {
    if (!isoOrDateStr) return 'Date & Time TBA';
    const parsed = new Date(isoOrDateStr);
    if (Number.isNaN(parsed.getTime())) return isoOrDateStr;
    return parsed.toLocaleString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  buildTicketEmailHtml(
    ticket: EventTicket,
    event: ClubEvent,
    hasInlineLogo: boolean
  ): string {
    const formattedDate = this.formatEventDateTime(event.startDate || ticket.eventStartDate);
    const location = event.address || ticket.eventAddress || 'Venue TBA';
    const customLogoUrl = (event.logoUrl || ticket.eventLogoUrl || '').trim();
    const logoSrc = customLogoUrl
      ? customLogoUrl
      : hasInlineLogo
      ? 'cid:club-logo'
      : 'https://peasants-running-kit.store/logo.png';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your ${event.title} Ticket</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 16px rgba(15,23,42,0.06);">
          <!-- Header with Event or Club Logo -->
          <tr>
            <td align="center" style="background-color:#525e3e;padding:28px 24px;color:#ffffff;">
              <img src="${logoSrc}" alt="Peasants Revolt Running Club Logo" width="76" height="76" style="display:block;border-radius:50%;background-color:#ffffff;padding:4px;margin-bottom:12px;object-fit:contain;" />
              <div style="font-size:11px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#d9e2c6;margin-bottom:4px;">
                Peasants Revolt Running Club
              </div>
              <h1 style="margin:0;font-size:24px;font-weight:900;color:#ffffff;">
                ${event.title} — Entry Ticket
              </h1>
            </td>
          </tr>

          <!-- Greeting & Event Info -->
          <tr>
            <td style="padding:28px 28px 16px 28px;">
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#334155;">
                Hi <strong>${ticket.userName}</strong>,
              </p>
              <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#334155;">
                Your payment has been received! Here is your official entry ticket for <strong>${event.title}</strong>. Please have the QR code below ready to be scanned on arrival.
              </p>

              <!-- Event Details Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f2f5ec;border:1px solid #d5dec2;border-radius:14px;padding:18px;margin-bottom:24px;">
                <tr>
                  <td style="padding-bottom:10px;">
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#525e3e;letter-spacing:0.8px;">Date &amp; Time</div>
                    <div style="font-size:15px;font-weight:800;color:#0f172a;margin-top:2px;">${formattedDate}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:10px;">
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#525e3e;letter-spacing:0.8px;">Location</div>
                    <div style="font-size:15px;font-weight:800;color:#0f172a;margin-top:2px;">${location}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:10px;">
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#525e3e;letter-spacing:0.8px;">Attendee</div>
                    <div style="font-size:15px;font-weight:800;color:#0f172a;margin-top:2px;">${ticket.userName} (${ticket.userEmail})</div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#525e3e;letter-spacing:0.8px;">Ticket Reference</div>
                    <div style="font-size:15px;font-weight:800;color:#0f172a;font-family:monospace;margin-top:2px;">${ticket.id}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- QR Code Section -->
          <tr>
            <td align="center" style="padding:0 28px 28px 28px;">
              <div style="background-color:#ffffff;border:2px dashed #9ba582;border-radius:16px;padding:24px;text-align:center;">
                <div style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#525e3e;margin-bottom:12px;">
                  Door Entry QR Code
                </div>
                <img src="cid:ticket-qr" alt="Ticket QR Code for ${ticket.ticketUuid}" width="220" height="220" style="display:block;margin:0 auto 12px auto;border-radius:8px;" />
                <div style="font-size:11px;color:#64748b;margin-bottom:4px;">Unique Ticket UUID</div>
                <div style="font-size:12px;font-family:monospace;font-weight:700;color:#0f172a;word-break:break-all;">
                  ${ticket.ticketUuid}
                </div>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="background-color:#0f172a;padding:18px 24px;color:#94a3b8;font-size:12px;">
              Peasants Revolt Running Club &bull; Brentwood<br />
              <a href="https://www.instagram.com/prrcbrentwood/" style="color:#9ba582;text-decoration:none;font-weight:700;">@prrcbrentwood</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  async sendEventTicketEmail(
    ticket: EventTicket,
    event: ClubEvent
  ): Promise<{ sent: boolean; messageId?: string }> {
    const ticketUuid = ticket.ticketUuid;
    if (!ticketUuid) {
      throw new Error(`Ticket ${ticket.id} does not have a ticketUuid to encode in the QR code.`);
    }

    const qrPngBuffer = await QRCode.toBuffer(ticketUuid, {
      type: 'png',
      width: 320,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    const customLogoUrl = (event.logoUrl || ticket.eventLogoUrl || '').trim();
    const logoBuffer = customLogoUrl ? null : this.loadClubLogoBuffer();
    const html = this.buildTicketEmailHtml(ticket, event, Boolean(logoBuffer));

    const defaultFrom = getDefaultEventsFromEmail();
    const configuredFrom = event.fromEmail?.trim();
    const fromAddress =
      isQaEnvironment() && (!configuredFrom || configuredFrom === DEFAULT_EVENTS_FROM_EMAIL)
        ? defaultFrom
        : configuredFrom || defaultFrom;
    const subject = `Your Peasants Running Club Ticket: ${event.title} (${ticket.id})`;

    const apiKey = await this.resolveResendApiKey();
    if (!apiKey) {
      console.log(
        `[ResendTicketEmailAdapter Preview] No Resend API key configured in Secret Manager or env. Simulated sending ticket email for ${ticket.id} (UUID: ${ticketUuid}) from '${fromAddress}' to '${ticket.userEmail}'.`
      );
      return { sent: true, messageId: `simulated_${ticket.id}` };
    }

    const resend = this.resendFactory(apiKey);
    const attachments: Array<{
      filename: string;
      content: Buffer;
      contentId?: string;
    }> = [
      {
        filename: `ticket-${ticket.id}.png`,
        content: qrPngBuffer,
        contentId: 'ticket-qr',
      },
    ];

    if (logoBuffer) {
      attachments.push({
        filename: 'logo.png',
        content: logoBuffer,
        contentId: 'club-logo',
      });
    }

    const response = await resend.emails.send({
      from: fromAddress,
      to: [ticket.userEmail],
      subject,
      html,
      attachments,
    });

    if (response?.error) {
      throw new Error(
        `Resend failed to send ticket email: ${
          response.error.message || JSON.stringify(response.error)
        }`
      );
    }

    const messageId = response?.data?.id || `resend_${ticket.id}`;
    console.log(
      `[ResendTicketEmailAdapter] Sent event ticket email for ${ticket.id} (UUID: ${ticketUuid}) to ${ticket.userEmail} (id: ${messageId})`
    );
    return { sent: true, messageId };
  }
}
