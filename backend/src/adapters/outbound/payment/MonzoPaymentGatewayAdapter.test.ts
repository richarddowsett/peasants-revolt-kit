import { describe, it, expect } from 'vitest';
import { MonzoPaymentGatewayAdapter } from './MonzoPaymentGatewayAdapter';

describe('MonzoPaymentGatewayAdapter (backward compatibility alias)', () => {
  it('generates a revolut.me deep payment link with default username terenclgf, amount in pence, and &note=<payment-ref>', () => {
    const gateway = new MonzoPaymentGatewayAdapter();
    const link = gateway.generatePaymentLink('PRRC-1001', 25);
    expect(link).toBe('https://revolut.me/terenclgf?currency=GBP&amount=2500&note=PRRC-1001');
  });

  it('returns gateway name as Revolut', () => {
    const gateway = new MonzoPaymentGatewayAdapter();
    expect(gateway.getGatewayName()).toBe('Revolut');
  });
});
