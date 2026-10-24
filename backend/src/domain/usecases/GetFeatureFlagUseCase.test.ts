import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetFeatureFlagUseCase } from './GetFeatureFlagUseCase';
import { FeatureFlagRepositoryOutboundPort } from '../ports/outbound/FeatureFlagRepositoryOutboundPort';
import { FeatureFlag } from '../entities/FeatureFlag';

describe('GetFeatureFlagUseCase', () => {
  let mockRepo: FeatureFlagRepositoryOutboundPort;
  let useCase: GetFeatureFlagUseCase;

  beforeEach(() => {
    mockRepo = {
      getFeatureFlag: vi.fn(),
      getAllFeatureFlags: vi.fn(),
      setFeatureFlag: vi.fn(),
    };
    useCase = new GetFeatureFlagUseCase(mockRepo);
  });

  it('should throw an error if flag ID is empty or whitespace', async () => {
    await expect(useCase.getFlag('')).rejects.toThrow('Feature flag ID is required.');
    await expect(useCase.getFlag('   ')).rejects.toThrow('Feature flag ID is required.');
  });

  it('should return flag from repository when ID is provided', async () => {
    const flag: FeatureFlag = {
      id: 'store_closed',
      name: 'Store Closed',
      enabled: true,
      updatedAt: '2026-01-01T00:00:00Z',
    };
    vi.mocked(mockRepo.getFeatureFlag).mockResolvedValue(flag);

    const result = await useCase.getFlag('store_closed');
    expect(result).toEqual(flag);
    expect(mockRepo.getFeatureFlag).toHaveBeenCalledWith('store_closed');
  });

  it('should return all flags from repository', async () => {
    const flags: FeatureFlag[] = [
      {
        id: 'store_closed',
        name: 'Store Closed',
        enabled: false,
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];
    vi.mocked(mockRepo.getAllFeatureFlags).mockResolvedValue(flags);

    const result = await useCase.getAllFlags();
    expect(result).toEqual(flags);
    expect(mockRepo.getAllFeatureFlags).toHaveBeenCalled();
  });
});
