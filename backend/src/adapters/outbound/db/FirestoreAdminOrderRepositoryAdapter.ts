import { OrderRepositoryOutboundPort } from '../../../domain/ports/outbound/OrderRepositoryOutboundPort';
import { Order, OrderStatus } from '../../../domain/entities/Order';
import { adminDb } from './FirebaseAdminConfig';

import { generateNextMonzoReference } from '../../../domain/utils/orderRef';

export class FirestoreAdminOrderRepositoryAdapter implements OrderRepositoryOutboundPort {
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
      await adminDb.collection(this.collectionName).doc(orderId).set(order);
    } catch (err) {
      console.warn('Firestore admin order save notice:', err);
    }

    FirestoreAdminOrderRepositoryAdapter.localMemoryStore.unshift(order);
    return order;
  }

  async getOrderById(id: string): Promise<Order | null> {
    try {
      const docSnap = await adminDb.collection(this.collectionName).doc(id).get();
      if (docSnap.exists) {
        return docSnap.data() as Order;
      }
    } catch (err) {
      console.warn('Firestore admin order getById notice:', err);
    }
    return FirestoreAdminOrderRepositoryAdapter.localMemoryStore.find((o) => o.id === id) || null;
  }

  async getOrdersByUserEmail(email: string): Promise<Order[]> {
    try {
      const snapshot = await adminDb
        .collection(this.collectionName)
        .where('userEmail', '==', email.toLowerCase())
        .get();
      if (!snapshot.empty) {
        return snapshot.docs.map((docSnap) => docSnap.data() as Order);
      }
    } catch (err) {
      console.warn('Firestore admin order getByUserEmail notice:', err);
    }
    return FirestoreAdminOrderRepositoryAdapter.localMemoryStore.filter(
      (o) => o.userEmail.toLowerCase() === email.toLowerCase()
    );
  }

  async getAllOrders(): Promise<Order[]> {
    try {
      const snapshot = await adminDb.collection(this.collectionName).get();
      if (!snapshot.empty) {
        const orders = snapshot.docs.map((docSnap) => docSnap.data() as Order);
        FirestoreAdminOrderRepositoryAdapter.localMemoryStore = orders;
        return orders;
      }
    } catch (err) {
      console.warn('Firestore admin order getAll notice:', err);
    }
    return FirestoreAdminOrderRepositoryAdapter.localMemoryStore;
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
      await adminDb.collection(this.collectionName).doc(orderId).set(updatedOrder, { merge: true });
    } catch (err) {
      console.warn('Firestore admin order update notice:', err);
    }

    const index = FirestoreAdminOrderRepositoryAdapter.localMemoryStore.findIndex(
      (o) => o.id === orderId
    );
    if (index >= 0) {
      FirestoreAdminOrderRepositoryAdapter.localMemoryStore[index] = updatedOrder;
    }

    return updatedOrder;
  }
}
