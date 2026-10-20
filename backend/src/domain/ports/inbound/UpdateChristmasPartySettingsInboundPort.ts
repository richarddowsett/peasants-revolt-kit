import { ChristmasPartySettings } from '../../entities/ChristmasPartySettings';

export interface UpdateChristmasPartySettingsInput {
  saleStartAt?: string;
  maxTickets?: number;
  ticketPrice?: number;
  partyDateTime?: string;
  partyLocation?: string;
  fromEmail?: string;
}

export interface UpdateChristmasPartySettingsInboundPort {
  execute(input: UpdateChristmasPartySettingsInput): Promise<ChristmasPartySettings>;
}
