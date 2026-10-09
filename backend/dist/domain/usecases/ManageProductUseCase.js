"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManageProductUseCase = void 0;
class ManageProductUseCase {
    constructor(productRepo) {
        this.productRepo = productRepo;
    }
    async saveProduct(command) {
        return this.productRepo.saveProduct(command);
    }
    async deleteProduct(id) {
        return this.productRepo.deleteProduct(id);
    }
}
exports.ManageProductUseCase = ManageProductUseCase;
