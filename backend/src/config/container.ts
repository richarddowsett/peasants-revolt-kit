// Driven (Outbound) Adapters
import { FirestoreAdminProductRepositoryAdapter } from '../adapters/outbound/db/FirestoreAdminProductRepositoryAdapter';
import { FirestoreAdminOrderRepositoryAdapter } from '../adapters/outbound/db/FirestoreAdminOrderRepositoryAdapter';
import { MonzoPaymentGatewayAdapter } from '../adapters/outbound/payment/MonzoPaymentGatewayAdapter';
import { PasswordAdminAuthAdapter } from '../adapters/outbound/auth/PasswordAdminAuthAdapter';
import { FirebaseAdminStorageAdapter } from '../adapters/outbound/storage/FirebaseAdminStorageAdapter';
import { FirestoreAdminFeatureFlagRepositoryAdapter } from '../adapters/outbound/db/FirestoreAdminFeatureFlagRepositoryAdapter';

// Core Use Cases (Implementing Inbound Ports)
import { GetProductsUseCase } from '../domain/usecases/GetProductsUseCase';
import { ManageProductUseCase } from '../domain/usecases/ManageProductUseCase';
import { CreateOrderUseCase } from '../domain/usecases/CreateOrderUseCase';
import { GetUserOrdersUseCase } from '../domain/usecases/GetUserOrdersUseCase';
import { UpdateOrderStatusUseCase } from '../domain/usecases/UpdateOrderStatusUseCase';
import { GetFeatureFlagUseCase } from '../domain/usecases/GetFeatureFlagUseCase';
import { SetFeatureFlagUseCase } from '../domain/usecases/SetFeatureFlagUseCase';

// Driving (Inbound) HTTP Controllers
import { ProductsController } from '../adapters/inbound/http/ProductsController';
import { OrdersController } from '../adapters/inbound/http/OrdersController';
import { AdminController } from '../adapters/inbound/http/AdminController';
import { UploadController } from '../adapters/inbound/http/UploadController';
import { FeatureFlagsController } from '../adapters/inbound/http/FeatureFlagsController';

// 1. Instantiate Driven (Outbound) Adapters
const productRepoAdapter = new FirestoreAdminProductRepositoryAdapter();
const orderRepoAdapter = new FirestoreAdminOrderRepositoryAdapter();
const paymentGatewayAdapter = new MonzoPaymentGatewayAdapter();
const adminAuthAdapter = new PasswordAdminAuthAdapter();
const storageAdapter = new FirebaseAdminStorageAdapter();
const featureFlagRepoAdapter = new FirestoreAdminFeatureFlagRepositoryAdapter();

// 2. Instantiate Core Use Cases (Injecting Driven Outbound Adapters)
const getProductsUseCase = new GetProductsUseCase(productRepoAdapter);
const manageProductUseCase = new ManageProductUseCase(productRepoAdapter);
const createOrderUseCase = new CreateOrderUseCase(
  orderRepoAdapter,
  paymentGatewayAdapter,
  featureFlagRepoAdapter
);
const getUserOrdersUseCase = new GetUserOrdersUseCase(orderRepoAdapter);
const updateOrderStatusUseCase = new UpdateOrderStatusUseCase(orderRepoAdapter);
const getFeatureFlagUseCase = new GetFeatureFlagUseCase(featureFlagRepoAdapter);
const setFeatureFlagUseCase = new SetFeatureFlagUseCase(featureFlagRepoAdapter);

// 3. Instantiate Driving (Inbound) HTTP Controllers (Injecting Core Use Cases / Ports)
export const productsController = new ProductsController(getProductsUseCase, manageProductUseCase);
export const ordersController = new OrdersController(
  createOrderUseCase,
  getUserOrdersUseCase,
  updateOrderStatusUseCase
);
export const adminController = new AdminController(adminAuthAdapter);
export const uploadController = new UploadController(storageAdapter);
export const featureFlagsController = new FeatureFlagsController(
  getFeatureFlagUseCase,
  setFeatureFlagUseCase
);

