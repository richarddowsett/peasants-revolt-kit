import { Request, Response } from 'express';
import { GetProductsInboundPort } from '../../../domain/ports/inbound/GetProductsInboundPort';
import { ManageProductInboundPort } from '../../../domain/ports/inbound/ManageProductInboundPort';

export class ProductsController {
  constructor(
    private getProductsUseCase: GetProductsInboundPort,
    private manageProductUseCase: ManageProductInboundPort
  ) {}

  async getProducts(req: Request, res: Response): Promise<void> {
    try {
      const onlyPublished = req.query.all !== 'true';
      const products = await this.getProductsUseCase.execute(onlyPublished);
      res.json(products);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }

  async saveProduct(req: Request, res: Response): Promise<void> {
    try {
      const product = await this.manageProductUseCase.saveProduct(req.body);
      res.status(201).json(product);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  }

  async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      await this.manageProductUseCase.deleteProduct(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
