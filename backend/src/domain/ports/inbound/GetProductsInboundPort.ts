import { Product } from '../../entities/Product';

export interface GetProductsInboundPort {
  execute(onlyPublished?: boolean): Promise<Product[]>;
}
