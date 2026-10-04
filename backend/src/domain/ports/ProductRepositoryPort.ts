import { Product } from '../models/Product';

export interface ProductRepositoryPort {
  getAllProducts(): Promise<Product[]>;
  getPublishedProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | null>;
  saveProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Product>;
  deleteProduct(id: string): Promise<boolean>;
}
