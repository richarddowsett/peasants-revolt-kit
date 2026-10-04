import { AdminAuthPort } from '../../domain/ports/AdminAuthPort';

export class PasswordAdminAuthAdapter implements AdminAuthPort {
  private readonly adminPassword: string;

  constructor(adminPassword: string = process.env.ADMIN_PASSWORD || 'peasants2026!') {
    this.adminPassword = adminPassword;
  }

  async verifyAdminPassword(password: string): Promise<boolean> {
    return password === this.adminPassword;
  }
}
