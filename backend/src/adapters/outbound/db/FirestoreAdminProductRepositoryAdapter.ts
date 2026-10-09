import { ProductRepositoryOutboundPort } from '../../../domain/ports/outbound/ProductRepositoryOutboundPort';
import { Product } from '../../../domain/entities/Product';
import { adminDb } from './FirebaseAdminConfig';

export class FirestoreAdminProductRepositoryAdapter implements ProductRepositoryOutboundPort {
  private readonly collectionName = 'products';
  private static localMemoryStore: Product[] = [];

  async getAllProducts(): Promise<Product[]> {
    try {
      const snapshot = await adminDb.collection(this.collectionName).get();
      if (!snapshot.empty) {
        const products: Product[] = snapshot.docs.map((docSnap) => ({
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
    return FirestoreAdminProductRepositoryAdapter.localMemoryStore;
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
    productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<Product> {
    const id = productData.id || `prod_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const now = new Date().toISOString();

    const product: Product = {
      ...productData,
      id,
      createdAt: (productData as any).createdAt || now,
      updatedAt: now,
    };

    try {
      await adminDb.collection(this.collectionName).doc(id).set(product, { merge: true });
    } catch (err) {
      console.warn('Firestore admin product save notice:', err);
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
      console.warn('Firestore admin product delete notice:', err);
    }
    FirestoreAdminProductRepositoryAdapter.localMemoryStore =
      FirestoreAdminProductRepositoryAdapter.localMemoryStore.filter((p) => p.id !== id);
    return true;
  }
}
