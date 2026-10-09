import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetProductsUseCase } from './GetProductsUseCase';
import { ProductRepositoryOutboundPort } from '../ports/outbound/ProductRepositoryOutboundPort';
import { Product } from '../entities/Product';

describe('GetProductsUseCase', () => {
  let productRepo: ProductRepositoryOutboundPort;
  let useCase: GetProductsUseCase;

  const mockPublishedProducts: Product[] = [
    {
      id: 'prod-1',
      name: 'Running Cap',
      description: 'Lightweight cap',
      price: 15,
      imageUrl: 'http://example.com/cap.png',
      sizes: ['S', 'M', 'L'],
      isPublished: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  const mockAllProducts: Product[] = [
    ...mockPublishedProducts,
    {
      id: 'prod-2',
      name: 'Unpublished Socks',
      description: 'Warm socks',
      price: 8,
      imageUrl: 'http://example.com/socks.png',
      sizes: ['M'],
      isPublished: false,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    productRepo = {
      getAllProducts: vi.fn().mockResolvedValue(mockAllProducts),
      getPublishedProducts: vi.fn().mockResolvedValue(mockPublishedProducts),
      saveProduct: vi.fn(),
      deleteProduct: vi.fn(),
    };
    useCase = new GetProductsUseCase(productRepo);
  });

  it('should fetch published products by default when onlyPublished argument is not provided', async () => {
    const products = await useCase.execute();

    expect(productRepo.getPublishedProducts).toHaveBeenCalledTimes(1);
    expect(productRepo.getAllProducts).not.toHaveBeenCalled();
    expect(products).toEqual(mockPublishedProducts);
  });

  it('should fetch published products when onlyPublished is true', async () => {
    const products = await useCase.execute(true);

    expect(productRepo.getPublishedProducts).toHaveBeenCalledTimes(1);
    expect(productRepo.getAllProducts).not.toHaveBeenCalled();
    expect(products).toEqual(mockPublishedProducts);
  });

  it('should fetch all products when onlyPublished is false', async () => {
    const products = await useCase.execute(false);

    expect(productRepo.getAllProducts).toHaveBeenCalledTimes(1);
    expect(productRepo.getPublishedProducts).not.toHaveBeenCalled();
    expect(products).toEqual(mockAllProducts);
  });

  it('should propagate errors thrown by getPublishedProducts', async () => {
    vi.mocked(productRepo.getPublishedProducts).mockRejectedValueOnce(new Error('Database error'));

    await expect(useCase.execute(true)).rejects.toThrow('Database error');
  });

  it('should propagate errors thrown by getAllProducts', async () => {
    vi.mocked(productRepo.getAllProducts).mockRejectedValueOnce(new Error('Database error'));

    await expect(useCase.execute(false)).rejects.toThrow('Database error');
  });
});
