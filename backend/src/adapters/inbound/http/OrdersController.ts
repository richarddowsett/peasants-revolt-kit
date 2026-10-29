import { Request, Response } from 'express';
import { CreateOrderInboundPort } from '../../../domain/ports/inbound/CreateOrderInboundPort';
import { GetUserOrdersInboundPort } from '../../../domain/ports/inbound/GetUserOrdersInboundPort';
import { UpdateOrderStatusInboundPort } from '../../../domain/ports/inbound/UpdateOrderStatusInboundPort';

export class OrdersController {
  constructor(
    private createOrderUseCase: CreateOrderInboundPort,
    private getUserOrdersUseCase: GetUserOrdersInboundPort,
    private updateOrderStatusUseCase: UpdateOrderStatusInboundPort
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
      res.status(isServerError ? 500 : 400).json({ error: message });
    }
  }

  async getOrders(req: Request, res: Response): Promise<void> {
    try {
      const { email, orderRef } = req.query;
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
        res.json(order);
        return;
      }
      if (email) {
        const orders = await this.getUserOrdersUseCase.getOrdersForUser(String(email));
        res.json(orders);
        return;
      }
      const orders = await this.getUserOrdersUseCase.getAllOrders();
      res.json(orders);
    } catch (err: unknown) {
      const message = (err as Error).message;
      console.error('[Order API ERROR] getOrders failed:', message);
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
      res.status(400).json({ error: message });
    }
  }
}
