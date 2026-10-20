import { Router } from 'express';
import multer from 'multer';
import {
  productsController,
  ordersController,
  adminController,
  uploadController,
  featureFlagsController,
  christmasPartyController,
} from '../../../config/container';

const upload = multer({ storage: multer.memoryStorage() });

export const apiRouter = Router();

// Health check
apiRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Peasants Running Kit Hexagonal Backend API' });
});

// Admin Auth
apiRouter.post('/admin/login', (req, res) => adminController.login(req, res));

// Feature Flags
apiRouter.get('/feature-flags', (req, res) => featureFlagsController.getFlags(req, res));
apiRouter.get('/feature-flags/:id', (req, res) => featureFlagsController.getFlag(req, res));
apiRouter.patch('/feature-flags/:id', (req, res) => featureFlagsController.setFlag(req, res));
apiRouter.post('/feature-flags/:id', (req, res) => featureFlagsController.setFlag(req, res));

// Products
apiRouter.get('/products', (req, res) => productsController.getProducts(req, res));
apiRouter.post('/products', (req, res) => productsController.saveProduct(req, res));
apiRouter.delete('/products/:id', (req, res) => productsController.deleteProduct(req, res));

// Image Upload (single or multiple files via multipart, or signed URL for direct bucket upload)
apiRouter.post('/upload', upload.any(), (req, res) => uploadController.uploadImage(req, res));
apiRouter.post('/upload/signed-url', (req, res) => uploadController.getSignedUploadUrl(req, res));

// Orders
apiRouter.post('/orders', (req, res) => ordersController.createOrder(req, res));
apiRouter.get('/orders', (req, res) => ordersController.getOrders(req, res));
apiRouter.patch('/orders/:id/status', (req, res) => ordersController.updateStatus(req, res));

// Christmas Party Tickets & Door QR Verification
apiRouter.get('/christmas-party/status', (req, res) =>
  christmasPartyController.getStatus(req, res)
);
apiRouter.put('/christmas-party/settings', (req, res) =>
  christmasPartyController.updateSettings(req, res)
);
apiRouter.post('/christmas-party/settings', (req, res) =>
  christmasPartyController.updateSettings(req, res)
);
apiRouter.post('/christmas-party/tickets', (req, res) =>
  christmasPartyController.purchaseTicket(req, res)
);
apiRouter.post('/christmas-party/tickets/:id/resend-email', (req, res) =>
  christmasPartyController.resendTicketEmail(req, res)
);
apiRouter.post('/christmas-party/verify-qr', (req, res) =>
  christmasPartyController.verifyQrAndCheckIn(req, res)
);


