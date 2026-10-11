import { ManageProductInboundPort, SaveProductCommand } from '../ports/inbound/ManageProductInboundPort';
import { ProductRepositoryOutboundPort } from '../ports/outbound/ProductRepositoryOutboundPort';
import { Product } from '../entities/Product';

export class ManageProductUseCase implements ManageProductInboundPort {
  constructor(private productRepo: ProductRepositoryOutboundPort) {}

  async saveProduct(command: SaveProductCommand): Promise<Product> {
    if (command.imageUrls && Array.isArray(command.imageUrls)) {
      for (const url of command.imageUrls) {
        if (typeof url === 'string' && url.startsWith('data:')) {
          throw new Error('Base64 image data is not allowed in product records. Upload images to the storage bucket via signed URL first.');
        }
      }
    }
    return this.productRepo.saveProduct(command);
  }

  async deleteProduct(id: string): Promise<boolean> {
    return this.productRepo.deleteProduct(id);
  }
}
