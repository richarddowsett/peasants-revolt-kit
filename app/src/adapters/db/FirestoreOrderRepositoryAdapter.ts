import { OrderRepositoryPort } from '@/domain/ports/OrderRepositoryPort';
import { Order, OrderStatus } from '@/domain/models/Order';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  query, 
  where 
} from 'firebase/firestore';

import { generateNextMonzoReference } from '@/domain/utils/orderRef';

export class FirestoreOrderRepositoryAdapter implements OrderRepositoryPort {
  private readonly collectionName = 'orders';
  private static localMemoryStore: Order[] = [];

  async createOrder(
    orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'paymentLinkUrl'> & { id?: string },
    paymentLinkUrl: string
  ): Promise<Order> {
    const existingOrders = await this.getAllOrders();
    const orderId = orderData.monzoReference || orderData.id || generateNextMonzoReference(existingOrders);
    const now = new Date().toISOString();


    const order: Order = {
      ...orderData,
      id: orderId,
      status: 'pending_payment',
      paymentLinkUrl,
      monzoReference: orderId,
      createdAt: now,
      updatedAt: now,
    };

    try {
      if (db) {
        const docRef = doc(db, this.collectionName, orderId);
        await setDoc(docRef, order);
      }
    } catch (err) {
      console.warn('Firestore order save notice:', err);
    }

    FirestoreOrderRepositoryAdapter.localMemoryStore.unshift(order);
    return order;
  }

  async getOrderById(id: string): Promise<Order | null> {
    try {
      if (db) {
        const docRef = doc(db, this.collectionName, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return docSnap.data() as Order;
        }
      }
    } catch (err) {
      console.warn('Firestore order getById notice:', err);
    }
    return FirestoreOrderRepositoryAdapter.localMemoryStore.find((o) => o.id === id) || null;
  }

  async getOrdersByUserEmail(email: string): Promise<Order[]> {
    try {
      if (db) {
        const colRef = collection(db, this.collectionName);
        const q = query(colRef, where('userEmail', '==', email.toLowerCase()));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          return snapshot.docs.map((docSnap) => docSnap.data() as Order);
        }
      }
    } catch (err) {
      console.warn('Firestore order getByUserEmail notice:', err);
    }
    return FirestoreOrderRepositoryAdapter.localMemoryStore.filter(
      (o) => o.userEmail.toLowerCase() === email.toLowerCase()
    );
  }

  async getAllOrders(): Promise<Order[]> {
    try {
      if (db) {
        const colRef = collection(db, this.collectionName);
        const snapshot = await getDocs(colRef);
        if (!snapshot.empty) {
          const orders = snapshot.docs.map((docSnap) => docSnap.data() as Order);
          FirestoreOrderRepositoryAdapter.localMemoryStore = orders;
          return orders;
        }
      }
    } catch (err) {
      console.warn('Firestore order getAll notice:', err);
    }
    return FirestoreOrderRepositoryAdapter.localMemoryStore;
  }

  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const order = await this.getOrderById(orderId);
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const updatedOrder: Order = {
      ...order,
      status,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (db) {
        const docRef = doc(db, this.collectionName, orderId);
        await setDoc(docRef, updatedOrder, { merge: true });
      }
    } catch (err) {
      console.warn('Firestore order update notice:', err);
    }

    const index = FirestoreOrderRepositoryAdapter.localMemoryStore.findIndex((o) => o.id === orderId);
    if (index >= 0) {
      FirestoreOrderRepositoryAdapter.localMemoryStore[index] = updatedOrder;
    }

    return updatedOrder;
  }
}
