import { FeatureFlag } from '../../entities/FeatureFlag';

export interface GetFeatureFlagInboundPort {
  getFlag(id: string): Promise<FeatureFlag | null>;
  getAllFlags(): Promise<FeatureFlag[]>;
}
