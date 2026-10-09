"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateOrderUseCase = void 0;
class CreateOrderUseCase {
    constructor(orderRepo, paymentGateway) {
        this.orderRepo = orderRepo;
        this.paymentGateway = paymentGateway;
    }
    async execute(command) {
        if (!command.items || command.items.length === 0) {
            throw new Error('Order must contain at least one item.');
        }
        const calculatedItems = command.items.map((item) => ({
            ...item,
            subtotal: item.price * item.quantity,
        }));
        const totalAmount = calculatedItems.reduce((acc, item) => acc + item.subtotal, 0);
        const randomRefNum = Math.floor(1000 + Math.random() * 9000);
        const tempOrderRef = `PRRC-${randomRefNum}`;
        const paymentLinkUrl = this.paymentGateway.generatePaymentLink(tempOrderRef, totalAmount);
        const orderData = {
            userEmail: command.userEmail,
            userName: command.userName,
            userId: command.userId,
            items: calculatedItems,
            totalAmount,
            status: 'pending_payment',
            monzoReference: tempOrderRef,
        };
        return this.orderRepo.createOrder(orderData, paymentLinkUrl);
    }
}
exports.CreateOrderUseCase = CreateOrderUseCase;
