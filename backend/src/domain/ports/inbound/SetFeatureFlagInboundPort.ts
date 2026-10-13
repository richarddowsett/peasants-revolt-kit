import { FeatureFlag } from '../../entities/FeatureFlag';

export interface SetFeatureFlagCommand {
  id: string;
  enabled: boolean;
  name?: string;
  description?: string;
}

export interface SetFeatureFlagInboundPort {
  execute(command: SetFeatureFlagCommand): Promise<FeatureFlag>;
}
