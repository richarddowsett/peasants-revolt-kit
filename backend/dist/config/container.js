"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadController = exports.adminController = exports.ordersController = exports.productsController = void 0;
// Driven (Outbound) Adapters
const FirestoreAdminProductRepositoryAdapter_1 = require("../adapters/outbound/db/FirestoreAdminProductRepositoryAdapter");
const FirestoreAdminOrderRepositoryAdapter_1 = require("../adapters/outbound/db/FirestoreAdminOrderRepositoryAdapter");
const MonzoPaymentGatewayAdapter_1 = require("../adapters/outbound/payment/MonzoPaymentGatewayAdapter");
const PasswordAdminAuthAdapter_1 = require("../adapters/outbound/auth/PasswordAdminAuthAdapter");
const FirebaseAdminStorageAdapter_1 = require("../adapters/outbound/storage/FirebaseAdminStorageAdapter");
// Core Use Cases (Implementing Inbound Ports)
const GetProductsUseCase_1 = require("../domain/usecases/GetProductsUseCase");
const ManageProductUseCase_1 = require("../domain/usecases/ManageProductUseCase");
const CreateOrderUseCase_1 = require("../domain/usecases/CreateOrderUseCase");
const GetUserOrdersUseCase_1 = require("../domain/usecases/GetUserOrdersUseCase");
const UpdateOrderStatusUseCase_1 = require("../domain/usecases/UpdateOrderStatusUseCase");
// Driving (Inbound) HTTP Controllers
const ProductsController_1 = require("../adapters/inbound/http/ProductsController");
const OrdersController_1 = require("../adapters/inbound/http/OrdersController");
const AdminController_1 = require("../adapters/inbound/http/AdminController");
const UploadController_1 = require("../adapters/inbound/http/UploadController");
// 1. Instantiate Driven (Outbound) Adapters
const productRepoAdapter = new FirestoreAdminProductRepositoryAdapter_1.FirestoreAdminProductRepositoryAdapter();
const orderRepoAdapter = new FirestoreAdminOrderRepositoryAdapter_1.FirestoreAdminOrderRepositoryAdapter();
const paymentGatewayAdapter = new MonzoPaymentGatewayAdapter_1.MonzoPaymentGatewayAdapter();
const adminAuthAdapter = new PasswordAdminAuthAdapter_1.PasswordAdminAuthAdapter();
const storageAdapter = new FirebaseAdminStorageAdapter_1.FirebaseAdminStorageAdapter();
// 2. Instantiate Core Use Cases (Injecting Driven Outbound Adapters)
const getProductsUseCase = new GetProductsUseCase_1.GetProductsUseCase(productRepoAdapter);
const manageProductUseCase = new ManageProductUseCase_1.ManageProductUseCase(productRepoAdapter);
const createOrderUseCase = new CreateOrderUseCase_1.CreateOrderUseCase(orderRepoAdapter, paymentGatewayAdapter);
const getUserOrdersUseCase = new GetUserOrdersUseCase_1.GetUserOrdersUseCase(orderRepoAdapter);
const updateOrderStatusUseCase = new UpdateOrderStatusUseCase_1.UpdateOrderStatusUseCase(orderRepoAdapter);
// 3. Instantiate Driving (Inbound) HTTP Controllers (Injecting Core Use Cases / Ports)
exports.productsController = new ProductsController_1.ProductsController(getProductsUseCase, manageProductUseCase);
exports.ordersController = new OrdersController_1.OrdersController(createOrderUseCase, getUserOrdersUseCase, updateOrderStatusUseCase);
exports.adminController = new AdminController_1.AdminController(adminAuthAdapter);
exports.uploadController = new UploadController_1.UploadController(storageAdapter);
