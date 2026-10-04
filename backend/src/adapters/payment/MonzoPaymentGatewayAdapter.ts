import { PaymentGatewayPort } from '../../domain/ports/PaymentGatewayPort';

export class MonzoPaymentGatewayAdapter implements PaymentGatewayPort {
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
