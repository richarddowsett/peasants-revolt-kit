import { AdminAuthOutboundPort } from '../../../domain/ports/outbound/AdminAuthOutboundPort';

export class PasswordAdminAuthAdapter implements AdminAuthOutboundPort {
  private readonly adminPassword: string;

  constructor(adminPassword: string = process.env.ADMIN_PASSWORD || 'peasants2026!') {
    this.adminPassword = adminPassword;
  }

  async verifyAdminPassword(password: string): Promise<boolean> {
    return password === this.adminPassword;
  }
}
