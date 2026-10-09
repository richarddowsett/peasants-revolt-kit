"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirebaseAdminStorageAdapter = void 0;
const FirebaseAdminConfig_1 = require("../db/FirebaseAdminConfig");
class FirebaseAdminStorageAdapter {
    async uploadFile(fileBuffer, fileName, mimeType) {
        try {
            const bucket = FirebaseAdminConfig_1.adminStorage.bucket();
            const uniqueFileName = `product-images/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const fileRef = bucket.file(uniqueFileName);
            await fileRef.save(fileBuffer, {
                metadata: { contentType: mimeType },
                public: true,
            });
            return `https://storage.googleapis.com/${bucket.name}/${uniqueFileName}`;
        }
        catch (err) {
            console.warn('GCS admin bucket upload fallback notice:', err);
            return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
        }
    }
}
exports.FirebaseAdminStorageAdapter = FirebaseAdminStorageAdapter;
