import { FeatureFlagRepositoryOutboundPort } from '../../../domain/ports/outbound/FeatureFlagRepositoryOutboundPort';
import { FeatureFlag } from '../../../domain/entities/FeatureFlag';
import { adminDb } from './FirebaseAdminConfig';

export class FirestoreAdminFeatureFlagRepositoryAdapter
  implements FeatureFlagRepositoryOutboundPort
{
  private readonly collectionName = 'feature-flags';
  private static localMemoryStore: Map<string, FeatureFlag> = new Map();

  async getFeatureFlag(id: string): Promise<FeatureFlag | null> {
    try {
      const docSnap = await adminDb.collection(this.collectionName).doc(id).get();
      if (docSnap.exists) {
        const flag = {
          id: docSnap.id,
          ...(docSnap.data() as Omit<FeatureFlag, 'id'>),
        } as FeatureFlag;
        FirestoreAdminFeatureFlagRepositoryAdapter.localMemoryStore.set(id, flag);
        return flag;
      }
    } catch (err) {
      console.warn(`[Firestore DB notice] Failed to read flag '${id}':`, err);
    }

    if (FirestoreAdminFeatureFlagRepositoryAdapter.localMemoryStore.has(id)) {
      return FirestoreAdminFeatureFlagRepositoryAdapter.localMemoryStore.get(id)!;
    }

    // Default configuration for standard flags if not yet initialized in DB
    if (id === 'store_closed') {
      const defaultFlag: FeatureFlag = {
        id: 'store_closed',
        name: 'Store Closed',
        enabled: false,
        description: 'Closes the storefront and displays the holding page',
        updatedAt: new Date().toISOString(),
      };
      return defaultFlag;
    }

    return null;
  }

  async getAllFeatureFlags(): Promise<FeatureFlag[]> {
    try {
      const snapshot = await adminDb.collection(this.collectionName).get();
      if (!snapshot.empty) {
        const flags: FeatureFlag[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<FeatureFlag, 'id'>),
        })) as FeatureFlag[];

        for (const f of flags) {
          FirestoreAdminFeatureFlagRepositoryAdapter.localMemoryStore.set(f.id, f);
        }

        // Ensure default store_closed flag is listed if not yet persisted
        if (!flags.some((f) => f.id === 'store_closed')) {
          flags.push({
            id: 'store_closed',
            name: 'Store Closed',
            enabled: false,
            description: 'Closes the storefront and displays the holding page',
            updatedAt: new Date().toISOString(),
          });
        }

        return flags;
      }
    } catch (err) {
      console.warn('[Firestore DB notice] Failed to list feature flags:', err);
    }

    const inMemoryFlags = Array.from(
      FirestoreAdminFeatureFlagRepositoryAdapter.localMemoryStore.values()
    );

    if (!inMemoryFlags.some((f) => f.id === 'store_closed')) {
      inMemoryFlags.push({
        id: 'store_closed',
        name: 'Store Closed',
        enabled: false,
        description: 'Closes the storefront and displays the holding page',
        updatedAt: new Date().toISOString(),
      });
    }

    return inMemoryFlags;
  }

  async setFeatureFlag(
    id: string,
    enabled: boolean,
    metadata?: { name?: string; description?: string }
  ): Promise<FeatureFlag> {
    const existing = await this.getFeatureFlag(id);
    const now = new Date().toISOString();

    const flag: FeatureFlag = {
      id,
      name:
        metadata?.name ||
        existing?.name ||
        (id === 'store_closed' ? 'Store Closed' : id),
      description:
        metadata?.description ||
        existing?.description ||
        (id === 'store_closed'
          ? 'Closes the storefront and displays the holding page'
          : ''),
      enabled,
      updatedAt: now,
    };

    try {
      await adminDb.collection(this.collectionName).doc(id).set(flag, { merge: true });
    } catch (err) {
      console.error(`[Firestore DB error] Failed to save feature flag '${id}':`, err);
      throw new Error(`Failed to save feature flag: ${(err as Error).message}`);
    }

    FirestoreAdminFeatureFlagRepositoryAdapter.localMemoryStore.set(id, flag);
    return flag;
  }
}
