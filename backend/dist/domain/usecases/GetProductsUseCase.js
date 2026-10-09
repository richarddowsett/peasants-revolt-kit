"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetProductsUseCase = void 0;
class GetProductsUseCase {
    constructor(productRepo) {
        this.productRepo = productRepo;
    }
    async execute(onlyPublished = true) {
        if (onlyPublished) {
            return this.productRepo.getPublishedProducts();
        }
        return this.productRepo.getAllProducts();
    }
}
exports.GetProductsUseCase = GetProductsUseCase;
