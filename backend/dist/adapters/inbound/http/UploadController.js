"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadController = void 0;
class UploadController {
    constructor(storageAdapter) {
        this.storageAdapter = storageAdapter;
    }
    async uploadImage(req, res) {
        try {
            if (!req.file) {
                res.status(400).json({ error: 'No image file uploaded' });
                return;
            }
            const imageUrl = await this.storageAdapter.uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
            res.json({ imageUrl });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}
exports.UploadController = UploadController;
