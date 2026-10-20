import { Order, OrderType } from './Order';

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

export type TicketVerificationReason =
  | 'CHECKED_IN'
  | 'ALREADY_CHECKED_IN'
  | 'UNPAID'
  | 'NOT_FOUND';

export interface TicketVerificationResult {
  valid: boolean;
  reason: TicketVerificationReason;
  message: string;
  order?: Order;
}

export const DEFAULT_CHRISTMAS_FROM_EMAIL =
  'Peasants Running Club <christmas@peasants-running-kit.store>';

export function getChristmasTicketOrderType(year: number): OrderType {
  return `christmas_${year}_ticket`;
}

export function isChristmasTicketOrderType(orderType?: string): orderType is `christmas_${number}_ticket` {
  return typeof orderType === 'string' && /^christmas_\d{4}_ticket$/.test(orderType);
}
