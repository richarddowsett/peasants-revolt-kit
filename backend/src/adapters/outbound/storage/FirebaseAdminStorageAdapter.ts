import { StorageOutboundPort, SignedUrlResponse } from '../../../domain/ports/outbound/StorageOutboundPort';
import { adminStorage } from '../db/FirebaseAdminConfig';

export class FirebaseAdminStorageAdapter implements StorageOutboundPort {
  async getSignedUploadUrl(fileName: string, mimeType: string): Promise<SignedUrlResponse> {
    const bucket = adminStorage.bucket();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `product-images/${Date.now()}_${sanitizedFileName}`;
    const fileRef = bucket.file(filePath);

    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    const [uploadUrl] = await fileRef.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: expiresAt,
      contentType: mimeType,
    });

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    return {
      uploadUrl,
      publicUrl,
      filePath,
    };
  }

  async uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    const bucket = adminStorage.bucket();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFileName = `product-images/${Date.now()}_${sanitizedFileName}`;
    const fileRef = bucket.file(uniqueFileName);

    await fileRef.save(fileBuffer, {
      metadata: { contentType: mimeType },
    });

    return `https://storage.googleapis.com/${bucket.name}/${uniqueFileName}`;
  }
}

