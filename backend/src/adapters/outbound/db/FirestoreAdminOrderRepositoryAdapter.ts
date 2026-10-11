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
      userEmail: orderData.userEmail.trim().toLowerCase(),
      status: 'pending_payment',
      paymentLinkUrl,
      monzoReference: orderId,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const docData: Record<string, any> = { ...order };
      if (docData.userId === undefined) {
        delete docData.userId;
      }
      await adminDb.collection(this.collectionName).doc(orderId).set(docData);
      console.log(
        `[Firestore DB] Order ${orderId} successfully persisted to collection '${this.collectionName}':`,
        JSON.stringify({
          id: order.id,
          userEmail: order.userEmail,
          userName: order.userName,
          totalAmount: order.totalAmount,
          itemCount: order.items?.length,
          items: order.items,
          monzoReference: order.monzoReference,
          status: order.status,
          createdAt: order.createdAt,
        })
      );
    } catch (err) {
      console.error(
        `[Firestore DB ERROR] Failed to persist order ${orderId} to collection '${this.collectionName}':`,
        err,
        'Order payload:',
        JSON.stringify(order)
      );
      throw new Error(`Failed to persist order to database: ${(err as Error).message}`);
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
    return (
      FirestoreAdminOrderRepositoryAdapter.localMemoryStore.find(
        (o) =>
          o.id.toUpperCase() === id.toUpperCase() ||
          (o.monzoReference && o.monzoReference.toUpperCase() === id.toUpperCase())
      ) || null
    );
  }

  async getOrdersByUserEmail(email: string): Promise<Order[]> {
    const normalized = email.trim().toLowerCase();
    try {
      const snapshot = await adminDb
        .collection(this.collectionName)
        .where('userEmail', '==', normalized)
        .get();
      if (!snapshot.empty) {
        return snapshot.docs.map((docSnap) => docSnap.data() as Order);
      }
    } catch (err) {
      console.warn('Firestore admin order getByUserEmail notice:', err);
    }
    return FirestoreAdminOrderRepositoryAdapter.localMemoryStore.filter(
      (o) => o.userEmail.trim().toLowerCase() === normalized
    );
  }

  async getAllOrders(): Promise<Order[]> {
    try {
      const snapshot = await adminDb.collection(this.collectionName).get();
      if (!snapshot.empty) {
        const orders = snapshot.docs.map((docSnap) => docSnap.data() as Order);
        const orderMap = new Map<string, Order>();
        for (const o of orders) orderMap.set(o.id, o);
        for (const o of FirestoreAdminOrderRepositoryAdapter.localMemoryStore) {
          if (!orderMap.has(o.id)) orderMap.set(o.id, o);
        }
        const merged = Array.from(orderMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        FirestoreAdminOrderRepositoryAdapter.localMemoryStore = merged;
        return merged;
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
      console.log(`[Firestore DB] Order ${orderId} status successfully updated to '${status}'`);
    } catch (err) {
      console.error(
        `[Firestore DB ERROR] Failed to update order ${orderId} status to '${status}':`,
        err
      );
      throw new Error(`Failed to update order status in database: ${(err as Error).message}`);
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
