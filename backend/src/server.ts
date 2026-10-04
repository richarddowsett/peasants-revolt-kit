import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';

import { FirestoreAdminProductRepositoryAdapter } from './adapters/db/FirestoreAdminProductRepositoryAdapter';
import { FirestoreAdminOrderRepositoryAdapter } from './adapters/db/FirestoreAdminOrderRepositoryAdapter';
import { MonzoPaymentGatewayAdapter } from './adapters/payment/MonzoPaymentGatewayAdapter';
import { PasswordAdminAuthAdapter } from './adapters/auth/PasswordAdminAuthAdapter';
import { FirebaseAdminStorageAdapter } from './adapters/storage/FirebaseAdminStorageAdapter';

import { GetProductsUseCase } from './domain/usecases/GetProductsUseCase';
import { ManageProductUseCase } from './domain/usecases/ManageProductUseCase';
import { CreateOrderUseCase } from './domain/usecases/CreateOrderUseCase';
import { GetUserOrdersUseCase } from './domain/usecases/GetUserOrdersUseCase';
import { UpdateOrderStatusUseCase } from './domain/usecases/UpdateOrderStatusUseCase';

dotenv.config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// Instantiate Hexagonal Adapters & Use Cases
const productRepo = new FirestoreAdminProductRepositoryAdapter();
const orderRepo = new FirestoreAdminOrderRepositoryAdapter();
const paymentGateway = new MonzoPaymentGatewayAdapter();
const authAdapter = new PasswordAdminAuthAdapter();
const storageAdapter = new FirebaseAdminStorageAdapter();

const getProductsUseCase = new GetProductsUseCase(productRepo);
const manageProductUseCase = new ManageProductUseCase(productRepo);
const createOrderUseCase = new CreateOrderUseCase(orderRepo, paymentGateway);
const getUserOrdersUseCase = new GetUserOrdersUseCase(orderRepo);
const updateOrderStatusUseCase = new UpdateOrderStatusUseCase(orderRepo);

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'Peasants Running Kit API' });
});

// Admin Auth verify
app.post('/api/admin/login', async (req: Request, res: Response) => {
  const { password } = req.body;
  const isValid = await authAdapter.verifyAdminPassword(password);
  if (isValid) {
    res.json({ success: true, token: 'admin_session_valid' });
  } else {
    res.status(401).json({ success: false, error: 'Incorrect admin password' });
  }
});

// Products Routes
app.get('/api/products', async (req: Request, res: Response) => {
  try {
    const onlyPublished = req.query.all !== 'true';
    const products = await getProductsUseCase.execute(onlyPublished);
    res.json(products);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req: Request, res: Response) => {
  try {
    const product = await manageProductUseCase.saveProduct(req.body);
    res.status(201).json(product);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req: Request, res: Response) => {
  try {
    await manageProductUseCase.deleteProduct(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// File Upload Route
app.post('/api/upload', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file uploaded' });
    }
    const downloadUrl = await storageAdapter.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
    res.json({ imageUrl: downloadUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Orders Routes
app.post('/api/orders', async (req: Request, res: Response) => {
  try {
    const order = await createOrderUseCase.execute(req.body);
    res.status(201).json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/orders', async (req: Request, res: Response) => {
  try {
    const { email } = req.query;
    if (email) {
      const orders = await getUserOrdersUseCase.getOrdersForUser(String(email));
      return res.json(orders);
    }
    const orders = await getUserOrdersUseCase.getAllOrders();
    res.json(orders);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const order = await updateOrderStatusUseCase.execute(req.params.id, status);
    res.json(order);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Peasants Running Kit API listening on port ${port}`);
});
