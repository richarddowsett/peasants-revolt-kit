import {
  SetFeatureFlagInboundPort,
  SetFeatureFlagCommand,
} from '../ports/inbound/SetFeatureFlagInboundPort';
import { FeatureFlagRepositoryOutboundPort } from '../ports/outbound/FeatureFlagRepositoryOutboundPort';
import { FeatureFlag } from '../entities/FeatureFlag';

export class SetFeatureFlagUseCase implements SetFeatureFlagInboundPort {
  constructor(private featureFlagRepo: FeatureFlagRepositoryOutboundPort) {}

  async execute(command: SetFeatureFlagCommand): Promise<FeatureFlag> {
    if (!command.id || !command.id.trim()) {
      throw new Error('Feature flag ID is required.');
    }
    if (typeof command.enabled !== 'boolean') {
      throw new Error('Feature flag enabled state must be a boolean.');
    }

    const trimmedId = command.id.trim();
    return this.featureFlagRepo.setFeatureFlag(trimmedId, command.enabled, {
      name: command.name?.trim(),
      description: command.description?.trim(),
    });
  }
}
