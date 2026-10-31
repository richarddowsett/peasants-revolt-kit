import { describe, it, expect } from 'vitest';
import { RevolutPaymentGatewayAdapter } from './RevolutPaymentGatewayAdapter';

describe('RevolutPaymentGatewayAdapter (Frontend)', () => {
  it('generates a revolut.me deep payment link with default username terenclgf, amount in pence, and &note=<payment-ref>', () => {
    const gateway = new RevolutPaymentGatewayAdapter();
    const link = gateway.generatePaymentLink('PRRC-1001', 25);
    expect(link).toBe('https://revolut.me/terenclgf?currency=GBP&amount=2500&note=PRRC-1001');
  });

  it('correctly calculates amount in pence for decimal values and suffixes &note', () => {
    const gateway = new RevolutPaymentGatewayAdapter();
    const link = gateway.generatePaymentLink('PRRC-1002', 29.99);
    expect(link).toBe('https://revolut.me/terenclgf?currency=GBP&amount=2999&note=PRRC-1002');
  });

  it('correctly URL encodes payment reference in &note parameter', () => {
    const gateway = new RevolutPaymentGatewayAdapter();
    const link = gateway.generatePaymentLink('PRRC 1234 & 5', 40);
    expect(link).toBe('https://revolut.me/terenclgf?currency=GBP&amount=4000&note=PRRC%201234%20%26%205');
  });

  it('generates payment link with custom username when provided', () => {
    const gateway = new RevolutPaymentGatewayAdapter('customuser');
    const link = gateway.generatePaymentLink('PRRC-9999', 10);
    expect(link).toBe('https://revolut.me/customuser?currency=GBP&amount=1000&note=PRRC-9999');
  });

  it('omits &note parameter if orderReference is empty', () => {
    const gateway = new RevolutPaymentGatewayAdapter();
    const link = gateway.generatePaymentLink('', 10);
    expect(link).toBe('https://revolut.me/terenclgf?currency=GBP&amount=1000');
  });

  it('returns gateway name as Revolut', () => {
    const gateway = new RevolutPaymentGatewayAdapter();
    expect(gateway.getGatewayName()).toBe('Revolut');
  });
});
