import { ProductRepositoryPort } from '../ports/ProductRepositoryPort';
import { Product } from '../models/Product';

export class ManageProductUseCase {
  constructor(private productRepo: ProductRepositoryPort) {}

  async saveProduct(
    productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<Product> {
    return this.productRepo.saveProduct(productData);
  }

  async deleteProduct(id: string): Promise<boolean> {
    return this.productRepo.deleteProduct(id);
  }
}
