import { Router } from 'express';
import multer from 'multer';
import {
  productsController,
  ordersController,
  adminController,
  uploadController,
  featureFlagsController,
  eventsController,
  requireAdminAuth,
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
apiRouter.patch('/feature-flags/:id', requireAdminAuth, (req, res) =>
  featureFlagsController.setFlag(req, res)
);
apiRouter.post('/feature-flags/:id', requireAdminAuth, (req, res) =>
  featureFlagsController.setFlag(req, res)
);

// Products
apiRouter.get('/products', (req, res) => productsController.getProducts(req, res));
apiRouter.post('/products', requireAdminAuth, (req, res) =>
  productsController.saveProduct(req, res)
);
apiRouter.delete('/products/:id', requireAdminAuth, (req, res) =>
  productsController.deleteProduct(req, res)
);

// Image Upload (single or multiple files via multipart, or signed URL for direct bucket upload)
apiRouter.post('/upload', requireAdminAuth, upload.any(), (req, res) =>
  uploadController.uploadImage(req, res)
);
apiRouter.post('/upload/signed-url', requireAdminAuth, (req, res) =>
  uploadController.getSignedUploadUrl(req, res)
);

// Orders
apiRouter.post('/orders', (req, res) => ordersController.createOrder(req, res));
apiRouter.get('/orders', (req, res) => ordersController.getOrders(req, res));
apiRouter.patch('/orders/:id/status', requireAdminAuth, (req, res) =>
  ordersController.updateStatus(req, res)
);

// Club Events & Tickets
apiRouter.post('/events/verify-qr', requireAdminAuth, (req, res) =>
  eventsController.verifyAndCheckInQr(req, res)
);
apiRouter.get('/events', (req, res) => eventsController.listEvents(req, res));
apiRouter.get('/events/:id', (req, res) => eventsController.getEventById(req, res));
apiRouter.post('/events', requireAdminAuth, (req, res) => eventsController.createEvent(req, res));
apiRouter.put('/events/:id', requireAdminAuth, (req, res) =>
  eventsController.updateEvent(req, res)
);
apiRouter.delete('/events/:id', requireAdminAuth, (req, res) =>
  eventsController.deleteEvent(req, res)
);
apiRouter.post('/events/:id/tickets', (req, res) => eventsController.purchaseTicket(req, res));
apiRouter.get('/events/:id/tickets', requireAdminAuth, (req, res) =>
  eventsController.listEventTickets(req, res)
);
apiRouter.patch('/event-tickets/:ticketId/status', requireAdminAuth, (req, res) =>
  eventsController.updateTicketStatus(req, res)
);
apiRouter.post('/event-tickets/:ticketId/resend-email', requireAdminAuth, (req, res) =>
  eventsController.resendTicketEmail(req, res)
);
