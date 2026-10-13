import { GetFeatureFlagInboundPort } from '../ports/inbound/GetFeatureFlagInboundPort';
import { FeatureFlagRepositoryOutboundPort } from '../ports/outbound/FeatureFlagRepositoryOutboundPort';
import { FeatureFlag } from '../entities/FeatureFlag';

export class GetFeatureFlagUseCase implements GetFeatureFlagInboundPort {
  constructor(private featureFlagRepo: FeatureFlagRepositoryOutboundPort) {}

  async getFlag(id: string): Promise<FeatureFlag | null> {
    if (!id || !id.trim()) {
      throw new Error('Feature flag ID is required.');
    }
    return this.featureFlagRepo.getFeatureFlag(id.trim());
  }

  async getAllFlags(): Promise<FeatureFlag[]> {
    return this.featureFlagRepo.getAllFeatureFlags();
  }
}
