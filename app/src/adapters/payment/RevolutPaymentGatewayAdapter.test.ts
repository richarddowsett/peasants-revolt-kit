import { describe, it, expect } from 'vitest';
import { RevolutPaymentGatewayAdapter } from './RevolutPaymentGatewayAdapter';

describe('RevolutPaymentGatewayAdapter (Frontend)', () => {
  it('generates a revolut.me deep payment link with default username terenclgf and amount in pence', () => {
    const gateway = new RevolutPaymentGatewayAdapter();
    const link = gateway.generatePaymentLink('PRRC-1001', 25);
    expect(link).toBe('https://revolut.me/terenclgf?currency=GBP&amount=2500');
  });

  it('correctly calculates amount in pence for decimal values', () => {
    const gateway = new RevolutPaymentGatewayAdapter();
    const link = gateway.generatePaymentLink('PRRC-1002', 29.99);
    expect(link).toBe('https://revolut.me/terenclgf?currency=GBP&amount=2999');
  });

  it('generates payment link with custom username when provided', () => {
    const gateway = new RevolutPaymentGatewayAdapter('customuser');
    const link = gateway.generatePaymentLink('PRRC-9999', 10);
    expect(link).toBe('https://revolut.me/customuser?currency=GBP&amount=1000');
  });

  it('returns gateway name as Revolut', () => {
    const gateway = new RevolutPaymentGatewayAdapter();
    expect(gateway.getGatewayName()).toBe('Revolut');
  });
});
