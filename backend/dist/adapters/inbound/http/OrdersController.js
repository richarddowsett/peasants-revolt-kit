"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersController = void 0;
class OrdersController {
    constructor(createOrderUseCase, getUserOrdersUseCase, updateOrderStatusUseCase) {
        this.createOrderUseCase = createOrderUseCase;
        this.getUserOrdersUseCase = getUserOrdersUseCase;
        this.updateOrderStatusUseCase = updateOrderStatusUseCase;
    }
    async createOrder(req, res) {
        try {
            const order = await this.createOrderUseCase.execute(req.body);
            res.status(201).json(order);
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
    async getOrders(req, res) {
        try {
            const { email } = req.query;
            if (email) {
                const orders = await this.getUserOrdersUseCase.getOrdersForUser(String(email));
                res.json(orders);
                return;
            }
            const orders = await this.getUserOrdersUseCase.getAllOrders();
            res.json(orders);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async updateStatus(req, res) {
        try {
            const { status } = req.body;
            const order = await this.updateOrderStatusUseCase.execute(req.params.id, status);
            res.json(order);
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
}
exports.OrdersController = OrdersController;
