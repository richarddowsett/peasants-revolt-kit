import { ProductRepositoryPort } from '../ports/ProductRepositoryPort';
import { Product } from '../models/Product';

export class GetProductsUseCase {
  constructor(private productRepo: ProductRepositoryPort) {}

  async execute(onlyPublished: boolean = true): Promise<Product[]> {
    if (onlyPublished) {
      return this.productRepo.getPublishedProducts();
    }
    return this.productRepo.getAllProducts();
  }
}
