"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsController = void 0;
class ProductsController {
    constructor(getProductsUseCase, manageProductUseCase) {
        this.getProductsUseCase = getProductsUseCase;
        this.manageProductUseCase = manageProductUseCase;
    }
    async getProducts(req, res) {
        try {
            const onlyPublished = req.query.all !== 'true';
            const products = await this.getProductsUseCase.execute(onlyPublished);
            res.json(products);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
    async saveProduct(req, res) {
        try {
            const product = await this.manageProductUseCase.saveProduct(req.body);
            res.status(201).json(product);
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
    async deleteProduct(req, res) {
        try {
            await this.manageProductUseCase.deleteProduct(req.params.id);
            res.json({ success: true });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}
exports.ProductsController = ProductsController;
