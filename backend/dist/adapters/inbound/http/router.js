"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiRouter = void 0;
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const container_1 = require("../../../config/container");
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
exports.apiRouter = (0, express_1.Router)();
// Health check
exports.apiRouter.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Peasants Running Kit Hexagonal Backend API' });
});
// Admin Auth
exports.apiRouter.post('/admin/login', (req, res) => container_1.adminController.login(req, res));
// Products
exports.apiRouter.get('/products', (req, res) => container_1.productsController.getProducts(req, res));
exports.apiRouter.post('/products', (req, res) => container_1.productsController.saveProduct(req, res));
exports.apiRouter.delete('/products/:id', (req, res) => container_1.productsController.deleteProduct(req, res));
// Image Upload (single or multiple files)
exports.apiRouter.post('/upload', upload.any(), (req, res) => container_1.uploadController.uploadImage(req, res));
// Orders
exports.apiRouter.post('/orders', (req, res) => container_1.ordersController.createOrder(req, res));
exports.apiRouter.get('/orders', (req, res) => container_1.ordersController.getOrders(req, res));
exports.apiRouter.patch('/orders/:id/status', (req, res) => container_1.ordersController.updateStatus(req, res));
