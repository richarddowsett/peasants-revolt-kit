import { FeatureFlag } from '../../entities/FeatureFlag';

export interface FeatureFlagRepositoryOutboundPort {
  getFeatureFlag(id: string): Promise<FeatureFlag | null>;
  getAllFeatureFlags(): Promise<FeatureFlag[]>;
  setFeatureFlag(
    id: string,
    enabled: boolean,
    metadata?: { name?: string; description?: string }
  ): Promise<FeatureFlag>;
}
