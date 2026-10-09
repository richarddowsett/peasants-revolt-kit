"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
class AdminController {
    constructor(adminAuthAdapter) {
        this.adminAuthAdapter = adminAuthAdapter;
    }
    async login(req, res) {
        try {
            const { password } = req.body;
            const isValid = await this.adminAuthAdapter.verifyAdminPassword(password);
            if (isValid) {
                res.json({ success: true, token: 'admin_session_valid' });
            }
            else {
                res.status(401).json({ success: false, error: 'Incorrect admin password' });
            }
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}
exports.AdminController = AdminController;
