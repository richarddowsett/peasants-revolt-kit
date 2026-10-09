"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirestoreAdminOrderRepositoryAdapter = void 0;
const FirebaseAdminConfig_1 = require("./FirebaseAdminConfig");
class FirestoreAdminOrderRepositoryAdapter {
    constructor() {
        this.collectionName = 'orders';
    }
    async createOrder(orderData, paymentLinkUrl) {
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const orderId = `PRRC-${randomNum}`;
        const now = new Date().toISOString();
        const order = {
            ...orderData,
            id: orderId,
            status: 'pending_payment',
            paymentLinkUrl,
            monzoReference: orderId,
            createdAt: now,
            updatedAt: now,
        };
        try {
            await FirebaseAdminConfig_1.adminDb.collection(this.collectionName).doc(orderId).set(order);
        }
        catch (err) {
            console.warn('Firestore admin order save notice:', err);
        }
        FirestoreAdminOrderRepositoryAdapter.localMemoryStore.unshift(order);
        return order;
    }
    async getOrderById(id) {
        try {
            const docSnap = await FirebaseAdminConfig_1.adminDb.collection(this.collectionName).doc(id).get();
            if (docSnap.exists) {
                return docSnap.data();
            }
        }
        catch (err) {
            console.warn('Firestore admin order getById notice:', err);
        }
        return FirestoreAdminOrderRepositoryAdapter.localMemoryStore.find((o) => o.id === id) || null;
    }
    async getOrdersByUserEmail(email) {
        try {
            const snapshot = await FirebaseAdminConfig_1.adminDb
                .collection(this.collectionName)
                .where('userEmail', '==', email.toLowerCase())
                .get();
            if (!snapshot.empty) {
                return snapshot.docs.map((docSnap) => docSnap.data());
            }
        }
        catch (err) {
            console.warn('Firestore admin order getByUserEmail notice:', err);
        }
        return FirestoreAdminOrderRepositoryAdapter.localMemoryStore.filter((o) => o.userEmail.toLowerCase() === email.toLowerCase());
    }
    async getAllOrders() {
        try {
            const snapshot = await FirebaseAdminConfig_1.adminDb.collection(this.collectionName).get();
            if (!snapshot.empty) {
                const orders = snapshot.docs.map((docSnap) => docSnap.data());
                FirestoreAdminOrderRepositoryAdapter.localMemoryStore = orders;
                return orders;
            }
        }
        catch (err) {
            console.warn('Firestore admin order getAll notice:', err);
        }
        return FirestoreAdminOrderRepositoryAdapter.localMemoryStore;
    }
    async updateOrderStatus(orderId, status) {
        const order = await this.getOrderById(orderId);
        if (!order) {
            throw new Error(`Order ${orderId} not found`);
        }
        const updatedOrder = {
            ...order,
            status,
            updatedAt: new Date().toISOString(),
        };
        try {
            await FirebaseAdminConfig_1.adminDb.collection(this.collectionName).doc(orderId).set(updatedOrder, { merge: true });
        }
        catch (err) {
            console.warn('Firestore admin order update notice:', err);
        }
        const index = FirestoreAdminOrderRepositoryAdapter.localMemoryStore.findIndex((o) => o.id === orderId);
        if (index >= 0) {
            FirestoreAdminOrderRepositoryAdapter.localMemoryStore[index] = updatedOrder;
        }
        return updatedOrder;
    }
}
exports.FirestoreAdminOrderRepositoryAdapter = FirestoreAdminOrderRepositoryAdapter;
FirestoreAdminOrderRepositoryAdapter.localMemoryStore = [];
