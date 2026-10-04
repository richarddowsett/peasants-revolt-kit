"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManageProductUseCase = void 0;
class ManageProductUseCase {
    constructor(productRepo) {
        this.productRepo = productRepo;
    }
    async saveProduct(productData) {
        return this.productRepo.saveProduct(productData);
    }
    async deleteProduct(id) {
        return this.productRepo.deleteProduct(id);
    }
}
exports.ManageProductUseCase = ManageProductUseCase;
