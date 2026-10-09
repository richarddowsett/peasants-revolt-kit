export interface AdminAuthInboundPort {
  verifyAdminPassword(password: string): Promise<boolean>;
}
