import {
  UpdateChristmasPartySettingsInboundPort,
  UpdateChristmasPartySettingsInput,
} from '../ports/inbound/UpdateChristmasPartySettingsInboundPort';
import { ChristmasPartySettingsRepositoryOutboundPort } from '../ports/outbound/ChristmasPartySettingsRepositoryOutboundPort';
import {
  ChristmasPartySettings,
  getDefaultChristmasFromEmail,
} from '../entities/ChristmasPartySettings';

export class UpdateChristmasPartySettingsUseCase
  implements UpdateChristmasPartySettingsInboundPort
{
  constructor(private settingsRepo: ChristmasPartySettingsRepositoryOutboundPort) {}

  async execute(input: UpdateChristmasPartySettingsInput): Promise<ChristmasPartySettings> {
    const existing = await this.settingsRepo.getSettings();

    const partyDateTime =
      input.partyDateTime !== undefined ? input.partyDateTime.trim() : existing.partyDateTime;

    // Allow clearing the party date to show the "No Christmas party, please check Instagram..." holding page
    if (!partyDateTime) {
      return this.settingsRepo.saveSettings({
        eventYear: null,
        partyDateTime: '',
        saleStartAt: input.saleStartAt !== undefined ? input.saleStartAt.trim() : existing.saleStartAt,
        maxTickets:
          input.maxTickets !== undefined ? Number(input.maxTickets) : existing.maxTickets,
        ticketPrice:
          input.ticketPrice !== undefined ? Number(input.ticketPrice) : existing.ticketPrice,
        partyLocation:
          input.partyLocation !== undefined ? input.partyLocation.trim() : existing.partyLocation,
        fromEmail:
          input.fromEmail !== undefined && input.fromEmail.trim()
            ? input.fromEmail.trim()
            : existing.fromEmail || getDefaultChristmasFromEmail(),
      });
    }

    const parsedPartyDate = new Date(partyDateTime);
    if (Number.isNaN(parsedPartyDate.getTime())) {
      throw new Error('Please provide a valid date and time for the Christmas party.');
    }

    const eventYear = parsedPartyDate.getFullYear();

    const saleStartAt =
      input.saleStartAt !== undefined ? input.saleStartAt.trim() : existing.saleStartAt;
    if (!saleStartAt || Number.isNaN(Date.parse(saleStartAt))) {
      throw new Error('Please provide a valid ticket sale countdown date and time.');
    }

    const maxTickets =
      input.maxTickets !== undefined ? Number(input.maxTickets) : existing.maxTickets;
    if (!Number.isFinite(maxTickets) || maxTickets < 1) {
      throw new Error('Ticket limit must be at least 1.');
    }

    const ticketPrice =
      input.ticketPrice !== undefined ? Number(input.ticketPrice) : existing.ticketPrice;
    if (!Number.isFinite(ticketPrice) || ticketPrice <= 0) {
      throw new Error('Ticket price must be greater than £0.');
    }

    const partyLocation =
      input.partyLocation !== undefined ? input.partyLocation.trim() : existing.partyLocation;
    if (!partyLocation) {
      throw new Error('Please provide the location of the Christmas party.');
    }

    const fromEmail =
      input.fromEmail !== undefined && input.fromEmail.trim()
        ? input.fromEmail.trim()
        : existing.fromEmail || getDefaultChristmasFromEmail();

    return this.settingsRepo.saveSettings({
      eventYear,
      saleStartAt,
      maxTickets: Math.floor(maxTickets),
      ticketPrice,
      partyDateTime,
      partyLocation,
      fromEmail,
    });
  }
}
