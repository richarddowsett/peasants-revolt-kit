import { OrderType } from './Order';

export interface ChristmasPartySettings {
  eventYear: number | null;
  saleStartAt: string;
  maxTickets: number;
  ticketPrice: number;
  partyDateTime: string;
  partyLocation: string;
  fromEmail: string;
  updatedAt: string;
}

export interface ChristmasPartyStatus {
  settings: ChristmasPartySettings;
  isPartyScheduled: boolean;
  isSaleOpen: boolean;
  ticketsSold: number;
  ticketsRemaining: number;
}

export const DEFAULT_CHRISTMAS_FROM_EMAIL =
  'Peasants Running Club <christmas@peasants-running-kit.store>';

export const QA_CHRISTMAS_FROM_EMAIL =
  'Peasants Running Club <chrismaspartyqa@peasants-running-kit.store>';

export function isQaEnvironment(): boolean {
  const env = (process.env.ENVIRONMENT || '').toLowerCase();
  const projectId = (process.env.PROJECT_ID || process.env.GCP_PROJECT || '').toLowerCase();
  return env === 'qa' || projectId.includes('-qa');
}

export function getDefaultChristmasFromEmail(): string {
  if (process.env.CHRISTMAS_EMAIL_FROM && process.env.CHRISTMAS_EMAIL_FROM.trim()) {
    return process.env.CHRISTMAS_EMAIL_FROM.trim();
  }
  if (isQaEnvironment()) {
    return QA_CHRISTMAS_FROM_EMAIL;
  }
  return DEFAULT_CHRISTMAS_FROM_EMAIL;
}

export function getChristmasTicketOrderType(year: number): OrderType {
  return `christmas_${year}_ticket`;
}

export function isChristmasTicketOrderType(orderType?: string): orderType is `christmas_${number}_ticket` {
  return typeof orderType === 'string' && /^christmas_\d{4}_ticket$/.test(orderType);
}

export function extractYearFromChristmasOrderType(orderType?: string): number | null {
  if (!orderType) return null;
  const match = orderType.match(/^christmas_(\d{4})_ticket$/);
  return match ? parseInt(match[1], 10) : null;
}
