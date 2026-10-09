// Driven (Outbound) Adapters
import { FirestoreAdminProductRepositoryAdapter } from '../adapters/outbound/db/FirestoreAdminProductRepositoryAdapter';
import { FirestoreAdminOrderRepositoryAdapter } from '../adapters/outbound/db/FirestoreAdminOrderRepositoryAdapter';
import { MonzoPaymentGatewayAdapter } from '../adapters/outbound/payment/MonzoPaymentGatewayAdapter';
import { PasswordAdminAuthAdapter } from '../adapters/outbound/auth/PasswordAdminAuthAdapter';
import { FirebaseAdminStorageAdapter } from '../adapters/outbound/storage/FirebaseAdminStorageAdapter';

// Core Use Cases (Implementing Inbound Ports)
import { GetProductsUseCase } from '../domain/usecases/GetProductsUseCase';
import { ManageProductUseCase } from '../domain/usecases/ManageProductUseCase';
import { CreateOrderUseCase } from '../domain/usecases/CreateOrderUseCase';
import { GetUserOrdersUseCase } from '../domain/usecases/GetUserOrdersUseCase';
import { UpdateOrderStatusUseCase } from '../domain/usecases/UpdateOrderStatusUseCase';

// Driving (Inbound) HTTP Controllers
import { ProductsController } from '../adapters/inbound/http/ProductsController';
import { OrdersController } from '../adapters/inbound/http/OrdersController';
import { AdminController } from '../adapters/inbound/http/AdminController';
import { UploadController } from '../adapters/inbound/http/UploadController';

// 1. Instantiate Driven (Outbound) Adapters
const productRepoAdapter = new FirestoreAdminProductRepositoryAdapter();
const orderRepoAdapter = new FirestoreAdminOrderRepositoryAdapter();
const paymentGatewayAdapter = new MonzoPaymentGatewayAdapter();
const adminAuthAdapter = new PasswordAdminAuthAdapter();
const storageAdapter = new FirebaseAdminStorageAdapter();

// 2. Instantiate Core Use Cases (Injecting Driven Outbound Adapters)
const getProductsUseCase = new GetProductsUseCase(productRepoAdapter);
const manageProductUseCase = new ManageProductUseCase(productRepoAdapter);
const createOrderUseCase = new CreateOrderUseCase(orderRepoAdapter, paymentGatewayAdapter);
const getUserOrdersUseCase = new GetUserOrdersUseCase(orderRepoAdapter);
const updateOrderStatusUseCase = new UpdateOrderStatusUseCase(orderRepoAdapter);

// 3. Instantiate Driving (Inbound) HTTP Controllers (Injecting Core Use Cases / Ports)
export const productsController = new ProductsController(getProductsUseCase, manageProductUseCase);
export const ordersController = new OrdersController(
  createOrderUseCase,
  getUserOrdersUseCase,
  updateOrderStatusUseCase
);
export const adminController = new AdminController(adminAuthAdapter);
export const uploadController = new UploadController(storageAdapter);
