import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FirestoreAdminFeatureFlagRepositoryAdapter } from './FirestoreAdminFeatureFlagRepositoryAdapter';
import { adminDb } from './FirebaseAdminConfig';

vi.mock('./FirebaseAdminConfig', () => {
  return {
    adminDb: {
      collection: vi.fn(),
    },
  };
});

describe('FirestoreAdminFeatureFlagRepositoryAdapter', () => {
  let adapter: FirestoreAdminFeatureFlagRepositoryAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new FirestoreAdminFeatureFlagRepositoryAdapter();
  });

  it('getFeatureFlag returns default store_closed flag with enabled: false if not in database', async () => {
    const mockDoc = {
      get: vi.fn().mockResolvedValue({ exists: false }),
    };
    (adminDb.collection as any).mockReturnValue({
      doc: vi.fn().mockReturnValue(mockDoc),
    });

    const flag = await adapter.getFeatureFlag('store_closed');
    expect(flag).toBeDefined();
    expect(flag?.id).toBe('store_closed');
    expect(flag?.enabled).toBe(false);
  });

  it('getFeatureFlag returns doc from Firestore when exists', async () => {
    const mockDoc = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        id: 'store_closed',
        data: () => ({
          name: 'Store Closed',
          enabled: true,
          updatedAt: '2026-01-01T00:00:00Z',
        }),
      }),
    };
    (adminDb.collection as any).mockReturnValue({
      doc: vi.fn().mockReturnValue(mockDoc),
    });

    const flag = await adapter.getFeatureFlag('store_closed');
    expect(flag?.id).toBe('store_closed');
    expect(flag?.enabled).toBe(true);
  });

  it('setFeatureFlag writes to Firestore feature-flags collection', async () => {
    const mockSet = vi.fn().mockResolvedValue(undefined);
    const mockDoc = {
      get: vi.fn().mockResolvedValue({ exists: false }),
      set: mockSet,
    };
    (adminDb.collection as any).mockReturnValue({
      doc: vi.fn().mockReturnValue(mockDoc),
    });

    const flag = await adapter.setFeatureFlag('store_closed', true);
    expect(flag.id).toBe('store_closed');
    expect(flag.enabled).toBe(true);
    expect(adminDb.collection).toHaveBeenCalledWith('feature-flags');
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'store_closed',
        enabled: true,
      }),
      { merge: true }
    );
  });
});
