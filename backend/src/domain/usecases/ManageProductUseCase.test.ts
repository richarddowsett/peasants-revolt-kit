import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManageProductUseCase } from './ManageProductUseCase';
import { ProductRepositoryOutboundPort } from '../ports/outbound/ProductRepositoryOutboundPort';
import { SaveProductCommand } from '../ports/inbound/ManageProductInboundPort';
import { Product } from '../entities/Product';

describe('ManageProductUseCase', () => {
  let productRepo: ProductRepositoryOutboundPort;
  let useCase: ManageProductUseCase;

  const mockProduct: Product = {
    id: 'prod-100',
    name: 'Trail Shoes',
    description: 'Durable trail running shoes',
    price: 120,
    imageUrl: 'http://example.com/shoes.png',
    sizes: ['8', '9', '10'],
    isPublished: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    productRepo = {
      getAllProducts: vi.fn(),
      getPublishedProducts: vi.fn(),
      saveProduct: vi.fn().mockResolvedValue(mockProduct),
      deleteProduct: vi.fn().mockResolvedValue(true),
    };

    useCase = new ManageProductUseCase(productRepo);
  });

  describe('saveProduct', () => {
    it('should delegate saving a product to the product repository and return the result', async () => {
      const command: SaveProductCommand = {
        name: 'Trail Shoes',
        description: 'Durable trail running shoes',
        price: 120,
        imageUrl: 'http://example.com/shoes.png',
        sizes: ['8', '9', '10'],
        isPublished: true,
      };

      const result = await useCase.saveProduct(command);

      expect(productRepo.saveProduct).toHaveBeenCalledTimes(1);
      expect(productRepo.saveProduct).toHaveBeenCalledWith(command);
      expect(result).toEqual(mockProduct);
    });

    it('should propagate errors when repository saveProduct fails', async () => {
      vi.mocked(productRepo.saveProduct).mockRejectedValueOnce(new Error('Save failed'));

      const command: SaveProductCommand = {
        name: 'Invalid Product',
        description: '',
        price: -10,
        imageUrl: '',
        sizes: [],
        isPublished: false,
      };

      await expect(useCase.saveProduct(command)).rejects.toThrow('Save failed');
    });
  });

  describe('deleteProduct', () => {
    it('should delegate deleting a product to the product repository and return true', async () => {
      const result = await useCase.deleteProduct('prod-100');

      expect(productRepo.deleteProduct).toHaveBeenCalledTimes(1);
      expect(productRepo.deleteProduct).toHaveBeenCalledWith('prod-100');
      expect(result).toBe(true);
    });

    it('should return false if repository returns false when deleting non-existent product', async () => {
      vi.mocked(productRepo.deleteProduct).mockResolvedValueOnce(false);

      const result = await useCase.deleteProduct('non-existent');

      expect(productRepo.deleteProduct).toHaveBeenCalledWith('non-existent');
      expect(result).toBe(false);
    });

    it('should propagate errors when repository deleteProduct fails', async () => {
      vi.mocked(productRepo.deleteProduct).mockRejectedValueOnce(new Error('Delete error'));

      await expect(useCase.deleteProduct('prod-100')).rejects.toThrow('Delete error');
    });
  });
});
