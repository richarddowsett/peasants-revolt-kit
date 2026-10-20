import { GetChristmasPartyStatusInboundPort } from '../ports/inbound/GetChristmasPartyStatusInboundPort';
import { ChristmasPartySettingsRepositoryOutboundPort } from '../ports/outbound/ChristmasPartySettingsRepositoryOutboundPort';
import { OrderRepositoryOutboundPort } from '../ports/outbound/OrderRepositoryOutboundPort';
import {
  ChristmasPartyStatus,
  getChristmasTicketOrderType,
} from '../entities/ChristmasPartySettings';

export class GetChristmasPartyStatusUseCase implements GetChristmasPartyStatusInboundPort {
  constructor(
    private settingsRepo: ChristmasPartySettingsRepositoryOutboundPort,
    private orderRepo: OrderRepositoryOutboundPort
  ) {}

  async execute(): Promise<ChristmasPartyStatus> {
    const settings = await this.settingsRepo.getSettings();
    const isPartyScheduled = Boolean(
      settings.partyDateTime && settings.partyDateTime.trim().length > 0 && settings.eventYear
    );

    if (!isPartyScheduled || !settings.eventYear) {
      return {
        settings,
        isPartyScheduled: false,
        isSaleOpen: false,
        ticketsSold: 0,
        ticketsRemaining: 0,
      };
    }

    const expectedOrderType = getChristmasTicketOrderType(settings.eventYear);
    const allOrders = await this.orderRepo.getAllOrders();
    const activeTicketOrders = allOrders.filter(
      (o) => o.orderType === expectedOrderType && o.status !== 'cancelled'
    );

    const ticketsSold = activeTicketOrders.length;
    const ticketsRemaining = Math.max(0, settings.maxTickets - ticketsSold);
    const saleStartMs = settings.saleStartAt ? Date.parse(settings.saleStartAt) : NaN;
    const isSaleOpen = !Number.isNaN(saleStartMs) && Date.now() >= saleStartMs;

    return {
      settings,
      isPartyScheduled: true,
      isSaleOpen,
      ticketsSold,
      ticketsRemaining,
    };
  }
}
