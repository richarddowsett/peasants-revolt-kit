import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { ProductsController } from './ProductsController';
import { GetProductsInboundPort } from '../../../domain/ports/inbound/GetProductsInboundPort';
import { ManageProductInboundPort } from '../../../domain/ports/inbound/ManageProductInboundPort';
import { Product } from '../../../domain/entities/Product';

describe('ProductsController', () => {
  let getProductsUseCase: GetProductsInboundPort;
  let manageProductUseCase: ManageProductInboundPort;
  let controller: ProductsController;
  let req: Partial<Request>;
  let res: Partial<Response>;

  const mockProduct: Product = {
    id: 'prod-1',
    name: 'Running Shorts',
    description: 'Comfortable shorts',
    price: 30,
    imageUrl: 'http://example.com/shorts.jpg',
    sizes: ['S', 'M'],
    isPublished: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    getProductsUseCase = {
      execute: vi.fn().mockResolvedValue([mockProduct]),
    };

    manageProductUseCase = {
      saveProduct: vi.fn().mockResolvedValue(mockProduct),
      deleteProduct: vi.fn().mockResolvedValue(true),
    };

    controller = new ProductsController(getProductsUseCase, manageProductUseCase);

    req = {
      query: {},
      params: {},
      body: {},
    };

    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('getProducts', () => {
    it('should call getProductsUseCase with true when query.all is not "true"', async () => {
      req.query = {};

      await controller.getProducts(req as Request, res as Response);

      expect(getProductsUseCase.execute).toHaveBeenCalledWith(true);
      expect(res.json).toHaveBeenCalledWith([mockProduct]);
    });

    it('should call getProductsUseCase with false when query.all is "true"', async () => {
      req.query = { all: 'true' };

      await controller.getProducts(req as Request, res as Response);

      expect(getProductsUseCase.execute).toHaveBeenCalledWith(false);
      expect(res.json).toHaveBeenCalledWith([mockProduct]);
    });

    it('should respond with status 500 when getProductsUseCase throws an error', async () => {
      vi.mocked(getProductsUseCase.execute).mockRejectedValueOnce(new Error('Fetch error'));

      await controller.getProducts(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Fetch error' });
    });
  });

  describe('saveProduct', () => {
    it('should save product and return status 201 with product JSON', async () => {
      const productBody = {
        name: 'Running Shorts',
        description: 'Comfortable shorts',
        price: 30,
        imageUrl: 'http://example.com/shorts.jpg',
        sizes: ['S', 'M'],
        isPublished: true,
      };
      req.body = productBody;

      await controller.saveProduct(req as Request, res as Response);

      expect(manageProductUseCase.saveProduct).toHaveBeenCalledWith(productBody);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockProduct);
    });

    it('should respond with status 400 when saveProduct throws an error', async () => {
      vi.mocked(manageProductUseCase.saveProduct).mockRejectedValueOnce(
        new Error('Invalid product data')
      );

      await controller.saveProduct(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid product data' });
    });
  });

  describe('deleteProduct', () => {
    it('should delete product and return status 200 with success true', async () => {
      req.params = { id: 'prod-1' };

      await controller.deleteProduct(req as Request, res as Response);

      expect(manageProductUseCase.deleteProduct).toHaveBeenCalledWith('prod-1');
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('should respond with status 500 when deleteProduct throws an error', async () => {
      req.params = { id: 'prod-1' };
      vi.mocked(manageProductUseCase.deleteProduct).mockRejectedValueOnce(
        new Error('Deletion failed')
      );

      await controller.deleteProduct(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Deletion failed' });
    });
  });
});
