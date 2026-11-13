import { Request, Response } from 'express';
import { CreateOrderInboundPort } from '../../../domain/ports/inbound/CreateOrderInboundPort';
import { GetUserOrdersInboundPort } from '../../../domain/ports/inbound/GetUserOrdersInboundPort';
import { UpdateOrderStatusInboundPort } from '../../../domain/ports/inbound/UpdateOrderStatusInboundPort';
import { ErrorAlertOutboundPort } from '../../../domain/ports/outbound/ErrorAlertOutboundPort';
import { AdminAuthOutboundPort } from '../../../domain/ports/outbound/AdminAuthOutboundPort';
import { Order } from '../../../domain/entities/Order';
import { extractBearerToken, isValidAdminRequest } from './authMiddleware';
import {
  isErrorAlreadyAlerted,
  isOrderBusinessValidationError,
} from '../../outbound/observability/ErrorObservabilityAdapter';

export interface UserTokenVerifier {
  verifyIdToken(token: string): Promise<{ email?: string; uid?: string }>;
}

function sanitizeOrderForCustomer(order: Order): Order {
  if (
    order.orderType === 'event_ticket' &&
    (order.status === 'pending_payment' || order.status === 'cancelled') &&
    order.ticketUuid
  ) {
    const { ticketUuid: _omitted, ...rest } = order;
    return rest;
  }
  return order;
}

export class OrdersController {
  constructor(
    private createOrderUseCase: CreateOrderInboundPort,
    private getUserOrdersUseCase: GetUserOrdersInboundPort,
    private updateOrderStatusUseCase: UpdateOrderStatusInboundPort,
    private errorAlertPort?: ErrorAlertOutboundPort,
    private adminAuthAdapter?: AdminAuthOutboundPort,
    private userTokenVerifier?: UserTokenVerifier
  ) {}

  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      console.log(
        `[Order API] Incoming order request from ${req.body?.userName || 'Anonymous'} (${req.body?.userEmail || 'No Email'}):`,
        JSON.stringify(req.body)
      );
      const order = await this.createOrderUseCase.execute(req.body);
      console.log(
        `[Order API] Order created successfully: [${order.id}] for ${order.userName} (${order.userEmail}) - Total: £${order.totalAmount} - Monzo Ref: ${order.monzoReference}`
      );
      res.status(201).json(order);
    } catch (err: unknown) {
      const message = (err as Error).message;
      console.error(
        `[Order API ERROR] Order creation failed for ${req.body?.userName || 'Anonymous'} (${req.body?.userEmail || 'No Email'}):`,
        message,
        'Payload:',
        JSON.stringify(req.body)
      );
      const isServerError =
        message.toLowerCase().includes('database') ||
        message.toLowerCase().includes('firestore');
      const httpStatus = isServerError ? 500 : 400;

      if (
        this.errorAlertPort &&
        !isOrderBusinessValidationError(message) &&
        !isErrorAlreadyAlerted(err)
      ) {
        await this.errorAlertPort.reportError({
          category: 'ORDER_FAILURE',
          operation: 'POST /api/orders',
          errorMessage: message,
          stack: (err as Error).stack,
          httpStatus,
          metadata: {
            itemCount: Array.isArray(req.body?.items) ? req.body.items.length : 0,
            items: req.body?.items,
            userName: req.body?.userName,
            userEmail: req.body?.userEmail,
          },
        });
      }

      res.status(httpStatus).json({ error: message });
    }
  }

  async getOrders(req: Request, res: Response): Promise<void> {
    try {
      const { email, orderRef } = req.query;
      const isAdmin = isValidAdminRequest(req, this.adminAuthAdapter);

      if (orderRef) {
        if (!email) {
          res.status(400).json({ error: 'Email address is required to track an order.' });
          return;
        }
        const order = await this.getUserOrdersUseCase.getOrderByRefAndEmail(
          String(orderRef),
          String(email)
        );
        if (!order) {
          console.warn(
            `[Order API] Order lookup failed: No order found for reference '${orderRef}' and email '${email}'`
          );
          res.status(404).json({ error: 'No order found matching that reference and email.' });
          return;
        }
        console.log(`[Order API] Order lookup successful: [${order.id}] for ${email}`);
        res.json(isAdmin ? order : sanitizeOrderForCustomer(order));
        return;
      }

      if (email) {
        if (this.adminAuthAdapter && !isAdmin) {
          const bearerToken = extractBearerToken(req);
          if (!bearerToken || !this.userTokenVerifier) {
            res.status(401).json({
              error: 'Unauthorized: Please sign in to view your order history.',
            });
            return;
          }
          try {
            const decoded = await this.userTokenVerifier.verifyIdToken(bearerToken);
            const verifiedEmail = (decoded.email || '').trim().toLowerCase();
            const requestedEmail = String(email).trim().toLowerCase();
            if (!verifiedEmail || verifiedEmail !== requestedEmail) {
              res.status(403).json({
                error: 'Forbidden: You can only view orders for your own email address.',
              });
              return;
            }
          } catch {
            res.status(401).json({
              error: 'Unauthorized: Invalid or expired authentication token.',
            });
            return;
          }
        }
        const orders = await this.getUserOrdersUseCase.getOrdersForUser(String(email));
        res.json(isAdmin ? orders : orders.map(sanitizeOrderForCustomer));
        return;
      }

      if (this.adminAuthAdapter && !isAdmin) {
        res.status(401).json({
          error: 'Unauthorized: Valid administrator session required.',
        });
        return;
      }

      const orders = await this.getUserOrdersUseCase.getAllOrders();
      res.json(orders);
    } catch (err: unknown) {
      const message = (err as Error).message;
      console.error('[Order API ERROR] getOrders failed:', message);
      if (this.errorAlertPort && !isErrorAlreadyAlerted(err)) {
        await this.errorAlertPort.reportError({
          category: 'ORDER_FAILURE',
          operation: 'GET /api/orders',
          errorMessage: message,
          stack: (err as Error).stack,
          httpStatus: 500,
          metadata: {
            orderRef: req.query?.orderRef,
            email: req.query?.email,
          },
        });
      }
      res.status(500).json({ error: message });
    }
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status, batchRef } = req.body;
      console.log(
        `[Order API] Updating order ${req.params.id} status to '${status}'${batchRef ? ` (batchRef: ${batchRef})` : ''}`
      );
      const order = batchRef !== undefined
        ? await this.updateOrderStatusUseCase.execute(req.params.id, status, batchRef)
        : await this.updateOrderStatusUseCase.execute(req.params.id, status);
      console.log(`[Order API] Order ${req.params.id} status successfully updated to '${status}'`);
      res.json(order);
    } catch (err: unknown) {
      const message = (err as Error).message;
      console.error(
        `[Order API ERROR] Failed to update order ${req.params.id} status:`,
        message
      );
      const isServerError =
        message.toLowerCase().includes('database') ||
        message.toLowerCase().includes('firestore');
      const httpStatus = isServerError ? 500 : 400;
      if (this.errorAlertPort && !isErrorAlreadyAlerted(err)) {
        await this.errorAlertPort.reportError({
          category: 'ADMIN_ACTION_FAILURE',
          operation: 'PATCH /api/orders/:id/status',
          errorMessage: message,
          stack: (err as Error).stack,
          httpStatus,
          metadata: {
            orderId: req.params?.id,
            status: req.body?.status,
            batchRef: req.body?.batchRef,
          },
        });
      }
      res.status(httpStatus).json({ error: message });
    }
  }
}
