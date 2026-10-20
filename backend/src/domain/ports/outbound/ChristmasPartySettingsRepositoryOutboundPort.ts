import { ChristmasPartySettings } from '../../entities/ChristmasPartySettings';

export interface ChristmasPartySettingsRepositoryOutboundPort {
  getSettings(): Promise<ChristmasPartySettings>;
  saveSettings(settings: Partial<ChristmasPartySettings>): Promise<ChristmasPartySettings>;
}
