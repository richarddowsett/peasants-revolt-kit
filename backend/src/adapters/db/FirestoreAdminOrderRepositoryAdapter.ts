import { OrderRepositoryPort } from '../../domain/ports/OrderRepositoryPort';
import { Order, OrderStatus } from '../../domain/models/Order';
import { adminDb } from './FirebaseAdminConfig';

export class FirestoreAdminOrderRepositoryAdapter implements OrderRepositoryPort {
  private readonly collectionName = 'orders';
  private static localMemoryStore: Order[] = [];

  async createOrder(
    orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'paymentLinkUrl'> & { id?: string },
    paymentLinkUrl: string
  ): Promise<Order> {
    const orderId = orderData.monzoReference || orderData.id || `PRRC-${Math.floor(1000 + Math.random() * 9000)}`;
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
