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

export class FirestoreOrderRepositoryAdapter implements OrderRepositoryPort {
  private readonly collectionName = 'orders';
  private static localMemoryStore: Order[] = [];

  async createOrder(
    orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'paymentLinkUrl'>,
    paymentLinkUrl: string
  ): Promise<Order> {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const orderId = `PRRC-${randomNum}`;
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
      const docRef = doc(db, this.collectionName, orderId);
      await setDoc(docRef, order);
    } catch (err) {
      console.warn('Firestore order save notice:', err);
    }

    FirestoreOrderRepositoryAdapter.localMemoryStore.unshift(order);
    return order;
  }

  async getOrderById(id: string): Promise<Order | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as Order;
      }
    } catch (err) {
      console.warn('Firestore order getById notice:', err);
    }
    return FirestoreOrderRepositoryAdapter.localMemoryStore.find((o) => o.id === id) || null;
  }

  async getOrdersByUserEmail(email: string): Promise<Order[]> {
    try {
      const colRef = collection(db, this.collectionName);
      const q = query(colRef, where('userEmail', '==', email.toLowerCase()));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map((docSnap) => docSnap.data() as Order);
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
      const colRef = collection(db, this.collectionName);
      const snapshot = await getDocs(colRef);
      if (!snapshot.empty) {
        const orders = snapshot.docs.map((docSnap) => docSnap.data() as Order);
        FirestoreOrderRepositoryAdapter.localMemoryStore = orders;
        return orders;
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
      const docRef = doc(db, this.collectionName, orderId);
      await setDoc(docRef, updatedOrder, { merge: true });
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
