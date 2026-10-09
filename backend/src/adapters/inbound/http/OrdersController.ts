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
      const order = await this.createOrderUseCase.execute(req.body);
      res.status(201).json(order);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async getOrders(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.query;
      if (email) {
        const orders = await this.getUserOrdersUseCase.getOrdersForUser(String(email));
        res.json(orders);
        return;
      }
      const orders = await this.getUserOrdersUseCase.getAllOrders();
      res.json(orders);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { status } = req.body;
      const order = await this.updateOrderStatusUseCase.execute(req.params.id, status);
      res.json(order);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }
}
