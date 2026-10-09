"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadController = void 0;
class UploadController {
    constructor(storageAdapter) {
        this.storageAdapter = storageAdapter;
    }
    async uploadImage(req, res) {
        try {
            const files = [];
            if (req.files && Array.isArray(req.files)) {
                files.push(...req.files);
            }
            else if (req.files && typeof req.files === 'object') {
                Object.values(req.files).forEach((fileArray) => {
                    files.push(...fileArray);
                });
            }
            else if (req.file) {
                files.push(req.file);
            }
            if (files.length === 0) {
                res.status(400).json({ error: 'No image file uploaded' });
                return;
            }
            const imageUrls = await Promise.all(files.map((file) => this.storageAdapter.uploadFile(file.buffer, file.originalname, file.mimetype)));
            res.json({
                imageUrl: imageUrls[0],
                imageUrls,
            });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}
exports.UploadController = UploadController;
