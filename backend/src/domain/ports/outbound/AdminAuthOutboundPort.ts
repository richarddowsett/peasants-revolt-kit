export interface AdminAuthOutboundPort {
  verifyAdminPassword(password: string): Promise<boolean>;
}
