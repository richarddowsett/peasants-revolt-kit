import { Product } from '../../entities/Product';

export interface SaveProductCommand {
  id?: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  sizes: string[];
  isPublished: boolean;
}

export interface ManageProductInboundPort {
  saveProduct(command: SaveProductCommand): Promise<Product>;
  deleteProduct(id: string): Promise<boolean>;
}
