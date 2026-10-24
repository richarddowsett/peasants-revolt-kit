import { describe, it, expect } from 'vitest';
import { generateNextMonzoReference } from './orderRef';

describe('orderRef - generateNextMonzoReference', () => {
  it('generates PRRC-0001 when order list is empty', () => {
    expect(generateNextMonzoReference([])).toBe('PRRC-0001');
    expect(generateNextMonzoReference()).toBe('PRRC-0001');
  });

  it('increments counter when existing orders have consecutive references', () => {
    const orders = [
      { id: 'PRRC-0001', monzoReference: 'PRRC-0001' },
      { id: 'PRRC-0002', monzoReference: 'PRRC-0002' },
      { id: 'PRRC-0003' },
    ];
    expect(generateNextMonzoReference(orders)).toBe('PRRC-0004');
  });

  it('reuses available gap in references if present', () => {
    const orders = [
      { id: 'PRRC-0002' },
      { monzoReference: 'PRRC-0003' },
    ];
    expect(generateNextMonzoReference(orders)).toBe('PRRC-0001');
  });
});
