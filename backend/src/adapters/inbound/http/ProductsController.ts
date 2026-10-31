import { Request, Response } from 'express';
import { GetProductsInboundPort } from '../../../domain/ports/inbound/GetProductsInboundPort';
import { ManageProductInboundPort } from '../../../domain/ports/inbound/ManageProductInboundPort';
import { ErrorAlertOutboundPort } from '../../../domain/ports/outbound/ErrorAlertOutboundPort';
import { isErrorAlreadyAlerted } from '../../outbound/observability/ErrorObservabilityAdapter';

export class ProductsController {
  constructor(
    private getProductsUseCase: GetProductsInboundPort,
    private manageProductUseCase: ManageProductInboundPort,
    private errorAlertPort?: ErrorAlertOutboundPort
  ) {}

  async getProducts(req: Request, res: Response): Promise<void> {
    try {
      const onlyPublished = req.query.all !== 'true';
      const products = await this.getProductsUseCase.execute(onlyPublished);
      res.json(products);
    } catch (err: unknown) {
      const message = (err as Error).message;
      if (this.errorAlertPort && !isErrorAlreadyAlerted(err)) {
        await this.errorAlertPort.reportError({
          category: 'ORDER_FAILURE',
          operation: 'GET /api/products',
          errorMessage: message,
          stack: (err as Error).stack,
          httpStatus: 500,
        });
      }
      res.status(500).json({ error: message });
    }
  }

  async saveProduct(req: Request, res: Response): Promise<void> {
    try {
      const product = await this.manageProductUseCase.saveProduct(req.body);
      res.status(201).json(product);
    } catch (err: unknown) {
      const message = (err as Error).message;
      if (this.errorAlertPort && !isErrorAlreadyAlerted(err)) {
        await this.errorAlertPort.reportError({
          category: 'ADMIN_ACTION_FAILURE',
          operation: 'POST /api/products',
          errorMessage: message,
          stack: (err as Error).stack,
          httpStatus: 400,
          metadata: { productId: req.body?.id },
        });
      }
      res.status(400).json({ error: message });
    }
  }

  async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      await this.manageProductUseCase.deleteProduct(req.params.id);
      res.json({ success: true });
    } catch (err: unknown) {
      const message = (err as Error).message;
      if (this.errorAlertPort && !isErrorAlreadyAlerted(err)) {
        await this.errorAlertPort.reportError({
          category: 'ADMIN_ACTION_FAILURE',
          operation: 'DELETE /api/products/:id',
          errorMessage: message,
          stack: (err as Error).stack,
          httpStatus: 500,
          metadata: { productId: req.params?.id },
        });
      }
      res.status(500).json({ error: message });
    }
  }
}
