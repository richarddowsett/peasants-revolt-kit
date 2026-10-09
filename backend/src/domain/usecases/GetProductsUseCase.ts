import { GetProductsInboundPort } from '../ports/inbound/GetProductsInboundPort';
import { ProductRepositoryOutboundPort } from '../ports/outbound/ProductRepositoryOutboundPort';
import { Product } from '../entities/Product';

export class GetProductsUseCase implements GetProductsInboundPort {
  constructor(private productRepo: ProductRepositoryOutboundPort) {}

  async execute(onlyPublished: boolean = true): Promise<Product[]> {
    if (onlyPublished) {
      return this.productRepo.getPublishedProducts();
    }
    return this.productRepo.getAllProducts();
  }
}
