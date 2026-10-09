"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetUserOrdersUseCase = void 0;
class GetUserOrdersUseCase {
    constructor(orderRepo) {
        this.orderRepo = orderRepo;
    }
    async getOrdersForUser(email) {
        return this.orderRepo.getOrdersByUserEmail(email);
    }
    async getAllOrders() {
        return this.orderRepo.getAllOrders();
    }
}
exports.GetUserOrdersUseCase = GetUserOrdersUseCase;
