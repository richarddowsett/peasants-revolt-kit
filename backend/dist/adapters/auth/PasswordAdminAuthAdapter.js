"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordAdminAuthAdapter = void 0;
class PasswordAdminAuthAdapter {
    constructor(adminPassword = process.env.ADMIN_PASSWORD || 'peasants2026!') {
        this.adminPassword = adminPassword;
    }
    async verifyAdminPassword(password) {
        return password === this.adminPassword;
    }
}
exports.PasswordAdminAuthAdapter = PasswordAdminAuthAdapter;
