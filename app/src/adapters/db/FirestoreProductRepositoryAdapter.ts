import { ProductRepositoryPort } from '@/domain/ports/ProductRepositoryPort';
import { Product } from '@/domain/models/Product';
import { INITIAL_PRODUCTS } from '@/domain/models/InitialProducts';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  deleteDoc 
} from 'firebase/firestore';

export class FirestoreProductRepositoryAdapter implements ProductRepositoryPort {
  private readonly collectionName = 'products';
  private static localMemoryStore: Product[] = [...INITIAL_PRODUCTS];

  async getAllProducts(): Promise<Product[]> {
    try {
      if (db) {
        const colRef = collection(db, this.collectionName);
        const snapshot = await getDocs(colRef);
        if (!snapshot.empty) {
          const products: Product[] = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<Product, 'id'>),
          }));
          FirestoreProductRepositoryAdapter.localMemoryStore = products;
          return products;
        } else if (FirestoreProductRepositoryAdapter.localMemoryStore.length === INITIAL_PRODUCTS.length) {
          // Database is empty - seed initial products into Firestore
          try {
            for (const item of INITIAL_PRODUCTS) {
              const docRef = doc(db, this.collectionName, item.id);
              await setDoc(docRef, item, { merge: true });
            }
          } catch (seedErr) {
            console.warn('Firestore seeding notice:', seedErr);
          }
        }
      }
    } catch (err) {
      console.warn('Firestore product fetch notice:', err);
    }
    return FirestoreProductRepositoryAdapter.localMemoryStore;
  }


  async getPublishedProducts(): Promise<Product[]> {
    const all = await this.getAllProducts();
    return all.filter((p) => p.isPublished);
  }

  async getProductById(id: string): Promise<Product | null> {
    try {
      if (db) {
        const docRef = doc(db, this.collectionName, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return { id: docSnap.id, ...(docSnap.data() as Omit<Product, 'id'>) };
        }
      }
    } catch (err) {
      console.warn('Firestore product getById notice:', err);
    }
    return FirestoreProductRepositoryAdapter.localMemoryStore.find((p) => p.id === id) || null;
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
      if (db) {
        const docRef = doc(db, this.collectionName, id);
        await setDoc(docRef, product, { merge: true });
      }
    } catch (err) {
      console.warn('Firestore product save notice:', err);
    }

    const index = FirestoreProductRepositoryAdapter.localMemoryStore.findIndex((p) => p.id === id);
    if (index >= 0) {
      FirestoreProductRepositoryAdapter.localMemoryStore[index] = product;
    } else {
      FirestoreProductRepositoryAdapter.localMemoryStore.push(product);
    }

    return product;
  }

  async deleteProduct(id: string): Promise<boolean> {
    try {
      if (db) {
        const docRef = doc(db, this.collectionName, id);
        await deleteDoc(docRef);
      }
    } catch (err) {
      console.warn('Firestore product delete notice:', err);
    }
    FirestoreProductRepositoryAdapter.localMemoryStore = 
      FirestoreProductRepositoryAdapter.localMemoryStore.filter((p) => p.id !== id);
    return true;
  }
}
