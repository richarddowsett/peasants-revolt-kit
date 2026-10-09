"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateOrderStatusUseCase = void 0;
class UpdateOrderStatusUseCase {
    constructor(orderRepo) {
        this.orderRepo = orderRepo;
    }
    async execute(orderId, status) {
        return this.orderRepo.updateOrderStatus(orderId, status);
    }
}
exports.UpdateOrderStatusUseCase = UpdateOrderStatusUseCase;
