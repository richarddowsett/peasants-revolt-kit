import { ManageProductInboundPort, SaveProductCommand } from '../ports/inbound/ManageProductInboundPort';
import { ProductRepositoryOutboundPort } from '../ports/outbound/ProductRepositoryOutboundPort';
import { Product } from '../entities/Product';

export class ManageProductUseCase implements ManageProductInboundPort {
  constructor(private productRepo: ProductRepositoryOutboundPort) {}

  async saveProduct(command: SaveProductCommand): Promise<Product> {
    return this.productRepo.saveProduct(command);
  }

  async deleteProduct(id: string): Promise<boolean> {
    return this.productRepo.deleteProduct(id);
  }
}
