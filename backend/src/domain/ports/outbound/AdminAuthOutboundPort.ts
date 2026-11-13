export interface AdminAuthOutboundPort {
  verifyAdminPassword(password: string): Promise<boolean>;
  generateAdminToken?(nowMs?: number): string;
  verifyAdminToken?(token: string, nowMs?: number): boolean;
}
