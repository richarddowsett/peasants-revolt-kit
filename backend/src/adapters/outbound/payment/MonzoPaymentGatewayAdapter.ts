import { PaymentGatewayOutboundPort } from '../../../domain/ports/outbound/PaymentGatewayOutboundPort';

export class MonzoPaymentGatewayAdapter implements PaymentGatewayOutboundPort {
  private readonly monzoUsername: string;

  constructor(monzoUsername: string = process.env.MONZO_USERNAME || 'peasantsrevolt') {
    this.monzoUsername = monzoUsername;
  }

  generatePaymentLink(orderReference: string, amount: number): string {
    const formattedAmount = amount.toFixed(2);
    const encodedRef = encodeURIComponent(orderReference);
    return `https://monzo.me/${this.monzoUsername}/${formattedAmount}?d=${encodedRef}`;
  }

  getGatewayName(): string {
    return 'Monzo';
  }
}
