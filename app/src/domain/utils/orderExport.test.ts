import { describe, it, expect } from 'vitest';
import { aggregateOrdersForManufacturer } from './orderExport';
import { Order } from '../models/Order';

describe('aggregateOrdersForManufacturer', () => {
  it('returns empty batch when no orders are provided', () => {
    const batch = aggregateOrdersForManufacturer([]);
    expect(batch.orderCount).toBe(0);
    expect(batch.orderIds).toEqual([]);
    expect(batch.productGroups).toEqual([]);
    expect(batch.totalQuantity).toBe(0);
    expect(batch.totalAmount).toBe(0);
  });

  it('filters orders by status when filterStatus is specified', () => {
    const orders: Order[] = [
      {
        id: 'ORD-1',
        userEmail: 'user1@example.com',
        userName: 'User One',
        status: 'payment_successful',
        totalAmount: 30,
        paymentLinkUrl: '',
        monzoReference: 'REF1',
        createdAt: '2026-10-10',
        updatedAt: '2026-10-10',
        items: [
          { productId: 'prod-1', productName: 'Race Vest', price: 30, size: "Men's M", quantity: 1, subtotal: 30 },
        ],
      },
      {
        id: 'ORD-2',
        userEmail: 'user2@example.com',
        userName: 'User Two',
        status: 'pending_payment',
        totalAmount: 30,
        paymentLinkUrl: '',
        monzoReference: 'REF2',
        createdAt: '2026-10-10',
        updatedAt: '2026-10-10',
        items: [
          { productId: 'prod-1', productName: 'Race Vest', price: 30, size: "Men's L", quantity: 1, subtotal: 30 },
        ],
      },
    ];

    const batch = aggregateOrdersForManufacturer(orders, 'payment_successful');
    expect(batch.orderCount).toBe(1);
    expect(batch.orderIds).toEqual(['ORD-1']);
    expect(batch.totalQuantity).toBe(1);
    expect(batch.totalAmount).toBe(30);
  });

  it('aggregates multiple items with same product, gender, and size across orders', () => {
    const orders: Order[] = [
      {
        id: 'ORD-1',
        userEmail: 'alice@example.com',
        userName: 'Alice',
        status: 'payment_successful',
        totalAmount: 50,
        paymentLinkUrl: '',
        monzoReference: 'REF1',
        createdAt: '2026-10-10',
        updatedAt: '2026-10-10',
        items: [
          { productId: 'vest', productName: 'Club Vest', price: 25, size: "Men's M", quantity: 2, subtotal: 50 },
        ],
      },
      {
        id: 'ORD-2',
        userEmail: 'bob@example.com',
        userName: 'Bob',
        status: 'payment_successful',
        totalAmount: 65,
        paymentLinkUrl: '',
        monzoReference: 'REF2',
        createdAt: '2026-10-10',
        updatedAt: '2026-10-10',
        items: [
          { productId: 'vest', productName: 'Club Vest', price: 25, size: "Men's M", quantity: 1, subtotal: 25 },
          { productId: 'vest', productName: 'Club Vest', price: 25, size: "Women's S", quantity: 1, subtotal: 25 },
          { productId: 'hoodie', productName: 'Club Hoodie', price: 40, size: 'L', quantity: 1, subtotal: 40 },
        ],
      },
    ];

    const batch = aggregateOrdersForManufacturer(orders);

    expect(batch.orderCount).toBe(2);
    expect(batch.totalQuantity).toBe(5); // 2 + 1 + 1 + 1
    expect(batch.totalAmount).toBe(140); // 50 + 25 + 25 + 40

    // Products sorted alphabetically: Club Hoodie, Club Vest
    expect(batch.productGroups).toHaveLength(2);
    expect(batch.productGroups[0].productName).toBe('Club Hoodie');
    expect(batch.productGroups[1].productName).toBe('Club Vest');

    // Vest rows sorted: Men's M first, Women's S second
    const vestGroup = batch.productGroups[1];
    expect(vestGroup.rows).toHaveLength(2);
    expect(vestGroup.rows[0].gender).toBe('men');
    expect(vestGroup.rows[0].rawSize).toBe('M');
    expect(vestGroup.rows[0].quantity).toBe(3);
    expect(vestGroup.rows[0].subtotal).toBe(75);

    expect(vestGroup.rows[1].gender).toBe('women');
    expect(vestGroup.rows[1].rawSize).toBe('S');
    expect(vestGroup.rows[1].quantity).toBe(1);
    expect(vestGroup.rows[1].subtotal).toBe(25);

    expect(vestGroup.totalQuantity).toBe(4);
    expect(vestGroup.totalAmount).toBe(100);
  });

  it('correctly sorts sizes in standard order (XS, S, M, L, XL, XXL)', () => {
    const orders: Order[] = [
      {
        id: 'ORD-1',
        userEmail: 'user@example.com',
        userName: 'User',
        status: 'payment_successful',
        totalAmount: 100,
        paymentLinkUrl: '',
        monzoReference: 'REF',
        createdAt: '2026-10-10',
        updatedAt: '2026-10-10',
        items: [
          { productId: 'tee', productName: 'T-Shirt', price: 20, size: "Men's XL", quantity: 1, subtotal: 20 },
          { productId: 'tee', productName: 'T-Shirt', price: 20, size: "Men's S", quantity: 1, subtotal: 20 },
          { productId: 'tee', productName: 'T-Shirt', price: 20, size: "Men's M", quantity: 1, subtotal: 20 },
          { productId: 'tee', productName: 'T-Shirt', price: 20, size: "Men's XXL", quantity: 1, subtotal: 20 },
        ],
      },
    ];

    const batch = aggregateOrdersForManufacturer(orders);
    const teeGroup = batch.productGroups[0];
    const sizes = teeGroup.rows.map((r) => r.rawSize);
    expect(sizes).toEqual(['S', 'M', 'XL', 'XXL']);
  });
});
