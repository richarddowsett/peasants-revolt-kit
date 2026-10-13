import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SetFeatureFlagUseCase } from './SetFeatureFlagUseCase';
import { FeatureFlagRepositoryOutboundPort } from '../ports/outbound/FeatureFlagRepositoryOutboundPort';
import { FeatureFlag } from '../entities/FeatureFlag';

describe('SetFeatureFlagUseCase', () => {
  let mockRepo: FeatureFlagRepositoryOutboundPort;
  let useCase: SetFeatureFlagUseCase;

  beforeEach(() => {
    mockRepo = {
      getFeatureFlag: vi.fn(),
      getAllFeatureFlags: vi.fn(),
      setFeatureFlag: vi.fn(),
    };
    useCase = new SetFeatureFlagUseCase(mockRepo);
  });

  it('should throw an error if id is missing or whitespace', async () => {
    await expect(useCase.execute({ id: '', enabled: true })).rejects.toThrow(
      'Feature flag ID is required.'
    );
    await expect(useCase.execute({ id: '   ', enabled: true })).rejects.toThrow(
      'Feature flag ID is required.'
    );
  });

  it('should throw an error if enabled is not a boolean', async () => {
    await expect(useCase.execute({ id: 'store_closed', enabled: 'true' as any })).rejects.toThrow(
      'Feature flag enabled state must be a boolean.'
    );
  });

  it('should call setFeatureFlag on repository with trimmed id and metadata', async () => {
    const updatedFlag: FeatureFlag = {
      id: 'store_closed',
      name: 'Store Closed',
      enabled: true,
      description: 'Closes storefront',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    (mockRepo.setFeatureFlag as any).mockResolvedValue(updatedFlag);

    const result = await useCase.execute({
      id: '  store_closed  ',
      enabled: true,
      name: 'Store Closed',
      description: 'Closes storefront',
    });

    expect(result).toEqual(updatedFlag);
    expect(mockRepo.setFeatureFlag).toHaveBeenCalledWith('store_closed', true, {
      name: 'Store Closed',
      description: 'Closes storefront',
    });
  });
});
