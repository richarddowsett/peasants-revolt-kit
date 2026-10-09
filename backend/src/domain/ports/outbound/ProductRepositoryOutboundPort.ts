import { Product } from '../../entities/Product';

export interface ProductRepositoryOutboundPort {
  getAllProducts(): Promise<Product[]>;
  getPublishedProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | null>;
  saveProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Product>;
  deleteProduct(id: string): Promise<boolean>;
}
