import { describe, it, expect } from 'vitest';
import {
  generateNextMonzoReference,
  generateNextEventTicketReference,
} from './orderRef';

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

describe('generateNextEventTicketReference', () => {
  it('starts at PRRC-EVT-yyyy-0001 for the specified year', () => {
    expect(generateNextEventTicketReference([], 2026)).toBe('PRRC-EVT-2026-0001');
  });

  it('increments sequentially within the same year and resets for a new year', () => {
    const tickets = [
      { id: 'PRRC-EVT-2026-0001', monzoReference: 'PRRC-EVT-2026-0001' },
      { id: 'PRRC-EVT-2026-0002', monzoReference: 'PRRC-EVT-2026-0002' },
    ];
    expect(generateNextEventTicketReference(tickets, 2026)).toBe('PRRC-EVT-2026-0003');
    expect(generateNextEventTicketReference(tickets, 2027)).toBe('PRRC-EVT-2027-0001');
  });
});
