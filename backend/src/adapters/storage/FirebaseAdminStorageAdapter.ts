import { StoragePort } from '../../domain/ports/StoragePort';
import { adminStorage } from '../db/FirebaseAdminConfig';

export class FirebaseAdminStorageAdapter implements StoragePort {
  async uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    try {
      const bucket = adminStorage.bucket();
      const uniqueFileName = `product-images/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const fileRef = bucket.file(uniqueFileName);

      await fileRef.save(fileBuffer, {
        metadata: { contentType: mimeType },
        public: true,
      });

      return `https://storage.googleapis.com/${bucket.name}/${uniqueFileName}`;
    } catch (err) {
      console.warn('GCS admin bucket upload fallback notice:', err);
      return `data:${mimeType};base64,${fileBuffer.toString('base64')}`;
    }
  }
}
