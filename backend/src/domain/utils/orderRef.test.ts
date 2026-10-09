import { describe, it, expect } from 'vitest';
import { generateNextMonzoReference } from './orderRef';

describe('generateNextMonzoReference', () => {
  it('starts at PRRC-0001 when no orders exist', () => {
    expect(generateNextMonzoReference([])).toBe('PRRC-0001');
  });

  it('increments sequentially from PRRC-0001', () => {
    const orders = [
      { id: 'PRRC-0001', monzoReference: 'PRRC-0001' },
      { id: 'PRRC-0002', monzoReference: 'PRRC-0002' },
    ];
    expect(generateNextMonzoReference(orders)).toBe('PRRC-0003');
  });

  it('fills gaps or handles legacy random references cleanly', () => {
    const orders = [
      { id: 'PRRC-8492', monzoReference: 'PRRC-8492' },
    ];
    expect(generateNextMonzoReference(orders)).toBe('PRRC-0001');
  });
});
