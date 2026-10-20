import { ChristmasPartyStatus } from '../../entities/ChristmasPartySettings';

export interface GetChristmasPartyStatusInboundPort {
  execute(): Promise<ChristmasPartyStatus>;
}
