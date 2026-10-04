export interface AdminAuthPort {
  verifyAdminPassword(password: string): Promise<boolean>;
}
