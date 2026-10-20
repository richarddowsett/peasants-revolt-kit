import { Order } from '../../entities/Order';
import { ChristmasPartySettings } from '../../entities/ChristmasPartySettings';

export interface EmailOutboundPort {
  sendChristmasPartyTicketEmail(
    order: Order,
    settings: ChristmasPartySettings
  ): Promise<{ sent: boolean; messageId?: string }>;
}
