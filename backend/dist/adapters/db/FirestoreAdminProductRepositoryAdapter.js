"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirestoreAdminProductRepositoryAdapter = void 0;
const FirebaseAdminConfig_1 = require("./FirebaseAdminConfig");
class FirestoreAdminProductRepositoryAdapter {
    constructor() {
        this.collectionName = 'products';
    }
    async getAllProducts() {
        try {
            const snapshot = await FirebaseAdminConfig_1.adminDb.collection(this.collectionName).get();
            if (!snapshot.empty) {
                const products = snapshot.docs.map((docSnap) => ({
                    id: docSnap.id,
                    ...docSnap.data(),
                }));
                FirestoreAdminProductRepositoryAdapter.localMemoryStore = products;
                return products;
            }
        }
        catch (err) {
            console.warn('Firestore admin products fetch notice:', err);
        }
        return FirestoreAdminProductRepositoryAdapter.localMemoryStore;
    }
    async getPublishedProducts() {
        const all = await this.getAllProducts();
        return all.filter((p) => p.isPublished);
    }
    async getProductById(id) {
        try {
            const docSnap = await FirebaseAdminConfig_1.adminDb.collection(this.collectionName).doc(id).get();
            if (docSnap.exists) {
                return { id: docSnap.id, ...docSnap.data() };
            }
        }
        catch (err) {
            console.warn('Firestore admin product getById notice:', err);
        }
        return FirestoreAdminProductRepositoryAdapter.localMemoryStore.find((p) => p.id === id) || null;
    }
    async saveProduct(productData) {
        const id = productData.id || `prod_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        const now = new Date().toISOString();
        const product = {
            ...productData,
            id,
            createdAt: productData.createdAt || now,
            updatedAt: now,
        };
        try {
            await FirebaseAdminConfig_1.adminDb.collection(this.collectionName).doc(id).set(product, { merge: true });
        }
        catch (err) {
            console.warn('Firestore admin product save notice:', err);
        }
        const index = FirestoreAdminProductRepositoryAdapter.localMemoryStore.findIndex((p) => p.id === id);
        if (index >= 0) {
            FirestoreAdminProductRepositoryAdapter.localMemoryStore[index] = product;
        }
        else {
            FirestoreAdminProductRepositoryAdapter.localMemoryStore.push(product);
        }
        return product;
    }
    async deleteProduct(id) {
        try {
            await FirebaseAdminConfig_1.adminDb.collection(this.collectionName).doc(id).delete();
        }
        catch (err) {
            console.warn('Firestore admin product delete notice:', err);
        }
        FirestoreAdminProductRepositoryAdapter.localMemoryStore =
            FirestoreAdminProductRepositoryAdapter.localMemoryStore.filter((p) => p.id !== id);
        return true;
    }
}
exports.FirestoreAdminProductRepositoryAdapter = FirestoreAdminProductRepositoryAdapter;
FirestoreAdminProductRepositoryAdapter.localMemoryStore = [];
