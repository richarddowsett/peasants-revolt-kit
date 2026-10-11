import { describe, it, expect } from 'vitest';
import { MonzoPaymentGatewayAdapter } from './MonzoPaymentGatewayAdapter';

describe('MonzoPaymentGatewayAdapter (Frontend)', () => {
  it('generates a monzo.me deep payment link with default username terenceanthonysumpter', () => {
    const gateway = new MonzoPaymentGatewayAdapter();
    const link = gateway.generatePaymentLink('PRRC-1001', 25.5);
    expect(link).toBe('https://monzo.me/terenceanthonysumpter/25.50?d=PRRC-1001');
  });

  it('generates payment link with custom username when provided', () => {
    const gateway = new MonzoPaymentGatewayAdapter('customuser');
    const link = gateway.generatePaymentLink('PRRC-9999', 10);
    expect(link).toBe('https://monzo.me/customuser/10.00?d=PRRC-9999');
  });

  it('correctly url encodes order reference', () => {
    const gateway = new MonzoPaymentGatewayAdapter();
    const link = gateway.generatePaymentLink('PRRC 1234 & 5', 40);
    expect(link).toBe('https://monzo.me/terenceanthonysumpter/40.00?d=PRRC%201234%20%26%205');
  });

  it('returns gateway name as Monzo', () => {
    const gateway = new MonzoPaymentGatewayAdapter();
    expect(gateway.getGatewayName()).toBe('Monzo');
  });
});
