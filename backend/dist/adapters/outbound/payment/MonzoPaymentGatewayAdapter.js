"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonzoPaymentGatewayAdapter = void 0;
class MonzoPaymentGatewayAdapter {
    constructor(monzoUsername = process.env.MONZO_USERNAME || 'peasantsrevolt') {
        this.monzoUsername = monzoUsername;
    }
    generatePaymentLink(orderReference, amount) {
        const formattedAmount = amount.toFixed(2);
        const encodedRef = encodeURIComponent(orderReference);
        return `https://monzo.me/${this.monzoUsername}/${formattedAmount}?d=${encodedRef}`;
    }
    getGatewayName() {
        return 'Monzo';
    }
}
exports.MonzoPaymentGatewayAdapter = MonzoPaymentGatewayAdapter;
