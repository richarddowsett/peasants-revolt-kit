import { Router } from 'express';
import multer from 'multer';
import {
  productsController,
  ordersController,
  adminController,
  uploadController,
} from '../../../config/container';

const upload = multer({ storage: multer.memoryStorage() });

export const apiRouter = Router();

// Health check
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Peasants Running Kit Hexagonal Backend API' });
});

// Admin Auth
apiRouter.post('/admin/login', (req, res) => adminController.login(req, res));

// Products
apiRouter.get('/products', (req, res) => productsController.getProducts(req, res));
apiRouter.post('/products', (req, res) => productsController.saveProduct(req, res));
apiRouter.delete('/products/:id', (req, res) => productsController.deleteProduct(req, res));

// Image Upload (single or multiple files)
apiRouter.post('/upload', upload.any(), (req, res) => uploadController.uploadImage(req, res));

// Orders
apiRouter.post('/orders', (req, res) => ordersController.createOrder(req, res));
apiRouter.get('/orders', (req, res) => ordersController.getOrders(req, res));
apiRouter.patch('/orders/:id/status', (req, res) => ordersController.updateStatus(req, res));
