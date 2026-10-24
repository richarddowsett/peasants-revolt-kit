import { Order } from '../models/Order';
import { GenderFit } from '../models/Product';
import { parseGenderFromSize } from '../models/SizeGuide';

export interface ManufacturerItemRow {
  gender: GenderFit;
  genderLabel: string;
  rawSize: string;
  fullSize: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface ManufacturerProductGroup {
  productId: string;
  productName: string;
  rows: ManufacturerItemRow[];
  totalQuantity: number;
  totalAmount: number;
}

export interface ManufacturerExportBatch {
  orderIds: string[];
  orderCount: number;
  productGroups: ManufacturerProductGroup[];
  totalQuantity: number;
  totalAmount: number;
  generatedAt: string;
}

const SIZE_SORT_RANK: Record<string, number> = {
  'XXS': 1,
  'XS': 2,
  'S': 3,
  'M': 4,
  'L': 5,
  'XL': 6,
  'XXL': 7,
  '2XL': 7,
  'XXXL': 8,
  '3XL': 8,
  '4XL': 9,
  'ONE SIZE': 10,
};

const GENDER_SORT_RANK: Record<GenderFit, number> = {
  men: 1,
  women: 2,
  unisex: 3,
};

function formatGenderLabel(gender: GenderFit): string {
  switch (gender) {
    case 'men':
      return "Men's";
    case 'women':
      return "Women's";
    case 'unisex':
    default:
      return 'Unisex';
  }
}

/**
 * Aggregates paid orders into a production-ready manufacturer export batch.
 * Groups by Product -> Gender -> Size, summing quantities and calculating subtotals.
 */
export function aggregateOrdersForManufacturer(
  orders: Order[],
  filterStatus?: string
): ManufacturerExportBatch {
  const kitOnlyOrders = orders.filter(
    (o) =>
      o.orderType !== 'event_ticket' &&
      !(typeof o.orderType === 'string' && /^christmas_\d{4}_ticket$/.test(o.orderType))
  );
  const eligibleOrders = filterStatus
    ? kitOnlyOrders.filter((o) => o.status === filterStatus)
    : kitOnlyOrders;

  const orderIds: string[] = eligibleOrders.map((o) => o.id);
  const productsMap = new Map<string, {
    productId: string;
    productName: string;
    rowsMap: Map<string, ManufacturerItemRow>;
  }>();

  for (const order of eligibleOrders) {
    for (const item of order.items || []) {
      const prodKey = item.productId || item.productName || 'unknown-product';
      if (!productsMap.has(prodKey)) {
        productsMap.set(prodKey, {
          productId: item.productId || prodKey,
          productName: item.productName || 'Unnamed Product',
          rowsMap: new Map(),
        });
      }

      const prodEntry = productsMap.get(prodKey)!;
      const { gender, rawSize } = parseGenderFromSize(item.size || 'M');
      const rowKey = `${gender}__${rawSize.toUpperCase()}`;

      const existingRow = prodEntry.rowsMap.get(rowKey);
      const itemSubtotal = typeof item.subtotal === 'number'
        ? item.subtotal
        : (item.price || 0) * (item.quantity || 1);

      if (existingRow) {
        existingRow.quantity += item.quantity || 1;
        existingRow.subtotal += itemSubtotal;
      } else {
        prodEntry.rowsMap.set(rowKey, {
          gender,
          genderLabel: formatGenderLabel(gender),
          rawSize: rawSize.toUpperCase(),
          fullSize: item.size || rawSize.toUpperCase(),
          quantity: item.quantity || 1,
          unitPrice: item.price || 0,
          subtotal: itemSubtotal,
        });
      }
    }
  }

  // Convert maps to sorted groups
  const productGroups: ManufacturerProductGroup[] = [];
  let grandTotalQuantity = 0;
  let grandTotalAmount = 0;

  for (const [, prodEntry] of productsMap) {
    const rows = Array.from(prodEntry.rowsMap.values());

    // Sort rows: first by Gender (Men -> Women -> Unisex), then by Size
    rows.sort((a, b) => {
      const genderDiff = (GENDER_SORT_RANK[a.gender] || 99) - (GENDER_SORT_RANK[b.gender] || 99);
      if (genderDiff !== 0) return genderDiff;

      const sizeRankA = SIZE_SORT_RANK[a.rawSize] || 999;
      const sizeRankB = SIZE_SORT_RANK[b.rawSize] || 999;
      if (sizeRankA !== sizeRankB) return sizeRankA - sizeRankB;

      return a.rawSize.localeCompare(b.rawSize);
    });

    const totalQuantity = rows.reduce((acc, r) => acc + r.quantity, 0);
    const totalAmount = rows.reduce((acc, r) => acc + r.subtotal, 0);

    grandTotalQuantity += totalQuantity;
    grandTotalAmount += totalAmount;

    productGroups.push({
      productId: prodEntry.productId,
      productName: prodEntry.productName,
      rows,
      totalQuantity,
      totalAmount,
    });
  }

  // Sort products alphabetically by name
  productGroups.sort((a, b) => a.productName.localeCompare(b.productName));

  return {
    orderIds,
    orderCount: eligibleOrders.length,
    productGroups,
    totalQuantity: grandTotalQuantity,
    totalAmount: grandTotalAmount,
    generatedAt: new Date().toISOString(),
  };
}
