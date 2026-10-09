import { Product, SizeGuideRow } from '../../entities/Product';

export interface SaveProductCommand {
  id?: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  imageUrls?: string[];
  sizes: string[];
  sizeGuideCategory?: string;
  sizeGuideRows?: SizeGuideRow[];
  isPublished: boolean;
}

export interface ManageProductInboundPort {
  saveProduct(command: SaveProductCommand): Promise<Product>;
  deleteProduct(id: string): Promise<boolean>;
}

