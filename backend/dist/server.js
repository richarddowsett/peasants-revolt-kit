"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const dotenv_1 = __importDefault(require("dotenv"));
const FirestoreAdminProductRepositoryAdapter_1 = require("./adapters/db/FirestoreAdminProductRepositoryAdapter");
const FirestoreAdminOrderRepositoryAdapter_1 = require("./adapters/db/FirestoreAdminOrderRepositoryAdapter");
const MonzoPaymentGatewayAdapter_1 = require("./adapters/payment/MonzoPaymentGatewayAdapter");
const PasswordAdminAuthAdapter_1 = require("./adapters/auth/PasswordAdminAuthAdapter");
const FirebaseAdminStorageAdapter_1 = require("./adapters/storage/FirebaseAdminStorageAdapter");
const GetProductsUseCase_1 = require("./domain/usecases/GetProductsUseCase");
const ManageProductUseCase_1 = require("./domain/usecases/ManageProductUseCase");
const CreateOrderUseCase_1 = require("./domain/usecases/CreateOrderUseCase");
const GetUserOrdersUseCase_1 = require("./domain/usecases/GetUserOrdersUseCase");
const UpdateOrderStatusUseCase_1 = require("./domain/usecases/UpdateOrderStatusUseCase");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 8080;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// Instantiate Hexagonal Adapters & Use Cases
const productRepo = new FirestoreAdminProductRepositoryAdapter_1.FirestoreAdminProductRepositoryAdapter();
const orderRepo = new FirestoreAdminOrderRepositoryAdapter_1.FirestoreAdminOrderRepositoryAdapter();
const paymentGateway = new MonzoPaymentGatewayAdapter_1.MonzoPaymentGatewayAdapter();
const authAdapter = new PasswordAdminAuthAdapter_1.PasswordAdminAuthAdapter();
const storageAdapter = new FirebaseAdminStorageAdapter_1.FirebaseAdminStorageAdapter();
const getProductsUseCase = new GetProductsUseCase_1.GetProductsUseCase(productRepo);
const manageProductUseCase = new ManageProductUseCase_1.ManageProductUseCase(productRepo);
const createOrderUseCase = new CreateOrderUseCase_1.CreateOrderUseCase(orderRepo, paymentGateway);
const getUserOrdersUseCase = new GetUserOrdersUseCase_1.GetUserOrdersUseCase(orderRepo);
const updateOrderStatusUseCase = new UpdateOrderStatusUseCase_1.UpdateOrderStatusUseCase(orderRepo);
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Peasants Running Kit API' });
});
// Admin Auth verify
app.post('/api/admin/login', async (req, res) => {
    const { password } = req.body;
    const isValid = await authAdapter.verifyAdminPassword(password);
    if (isValid) {
        res.json({ success: true, token: 'admin_session_valid' });
    }
    else {
        res.status(401).json({ success: false, error: 'Incorrect admin password' });
    }
});
// Products Routes
app.get('/api/products', async (req, res) => {
    try {
        const onlyPublished = req.query.all !== 'true';
        const products = await getProductsUseCase.execute(onlyPublished);
        res.json(products);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/api/products', async (req, res) => {
    try {
        const product = await manageProductUseCase.saveProduct(req.body);
        res.status(201).json(product);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.delete('/api/products/:id', async (req, res) => {
    try {
        await manageProductUseCase.deleteProduct(req.params.id);
        res.json({ success: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// File Upload Route
app.post('/api/upload', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file uploaded' });
        }
        const downloadUrl = await storageAdapter.uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
        res.json({ imageUrl: downloadUrl });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Orders Routes
app.post('/api/orders', async (req, res) => {
    try {
        const order = await createOrderUseCase.execute(req.body);
        res.status(201).json(order);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.get('/api/orders', async (req, res) => {
    try {
        const { email } = req.query;
        if (email) {
            const orders = await getUserOrdersUseCase.getOrdersForUser(String(email));
            return res.json(orders);
        }
        const orders = await getUserOrdersUseCase.getAllOrders();
        res.json(orders);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.patch('/api/orders/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const order = await updateOrderStatusUseCase.execute(req.params.id, status);
        res.json(order);
    }
    catch (err) {
        res.status(400).json({ error: err.message });
    }
});
app.listen(port, () => {
    console.log(`Peasants Running Kit API listening on port ${port}`);
});
