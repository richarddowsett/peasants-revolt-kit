import { Order } from '../../entities/Order';

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

export interface VerifyAndCheckInTicketInboundPort {
  execute(ticketUuid: string): Promise<TicketVerificationResult>;
}
