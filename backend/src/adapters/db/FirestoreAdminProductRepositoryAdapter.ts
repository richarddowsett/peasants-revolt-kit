import { ProductRepositoryPort } from '../../domain/ports/ProductRepositoryPort';
import { Product } from '../../domain/models/Product';
import { adminDb } from './FirebaseAdminConfig';

export class FirestoreAdminProductRepositoryAdapter implements ProductRepositoryPort {
  private readonly collectionName = 'products';
  private static localMemoryStore: Product[] = [];

  async getAllProducts(): Promise<Product[]> {
    try {
      const snapshot = await adminDb.collection(this.collectionName).get();
      if (!snapshot.empty) {
        const legacySeedIds = new Set(['prod_hoodie_01', 'prod_shorts_01', 'prod_tshirt_01', 'prod_vest_01']);

        for (const docSnap of snapshot.docs) {
          if (legacySeedIds.has(docSnap.id)) {
            docSnap.ref.delete().catch(() => {});
          }
        }

        const products: Product[] = snapshot.docs
          .filter((docSnap) => !legacySeedIds.has(docSnap.id))
          .map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Product, 'id'>),
          }));
        FirestoreAdminProductRepositoryAdapter.localMemoryStore = products;
        return products;
      } else {
        FirestoreAdminProductRepositoryAdapter.localMemoryStore = [];
        return [];
      }
    } catch (err) {
      console.warn('Firestore admin products fetch notice:', err);
    }
    return FirestoreAdminProductRepositoryAdapter.localMemoryStore.filter(
      (p) => !['prod_hoodie_01', 'prod_shorts_01', 'prod_tshirt_01', 'prod_vest_01'].includes(p.id)
    );
  }

  async getPublishedProducts(): Promise<Product[]> {
    const all = await this.getAllProducts();
    return all.filter((p) => p.isPublished);
  }

  async getProductById(id: string): Promise<Product | null> {
    try {
      const docSnap = await adminDb.collection(this.collectionName).doc(id).get();
      if (docSnap.exists) {
        return { id: docSnap.id, ...(docSnap.data() as Omit<Product, 'id'>) };
      }
    } catch (err) {
      console.warn('Firestore admin product getById notice:', err);
    }
    return FirestoreAdminProductRepositoryAdapter.localMemoryStore.find((p) => p.id === id) || null;
  }

  async saveProduct(
    productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string;
      createdAt?: string;
    }
  ): Promise<Product> {
    const id = productData.id || `prod_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date().toISOString();

    const product: Product = {
      ...productData,
      id,
      createdAt: productData.createdAt || now,
      updatedAt: now,
    };

    try {
      await adminDb.collection(this.collectionName).doc(id).set(product, { merge: true });
    } catch (err) {
      console.error('Failed to persist product to Firestore database:', err);
      throw new Error(`Failed to save product to database: ${(err as Error).message}`);
    }

    const index = FirestoreAdminProductRepositoryAdapter.localMemoryStore.findIndex((p) => p.id === id);
    if (index >= 0) {
      FirestoreAdminProductRepositoryAdapter.localMemoryStore[index] = product;
    } else {
      FirestoreAdminProductRepositoryAdapter.localMemoryStore.push(product);
    }

    return product;
  }

  async deleteProduct(id: string): Promise<boolean> {
    try {
      await adminDb.collection(this.collectionName).doc(id).delete();
    } catch (err) {
      console.error('Failed to delete product from Firestore database:', err);
      throw new Error(`Failed to delete product from database: ${(err as Error).message}`);
    }
    FirestoreAdminProductRepositoryAdapter.localMemoryStore =
      FirestoreAdminProductRepositoryAdapter.localMemoryStore.filter((p) => p.id !== id);
    return true;
  }
}
