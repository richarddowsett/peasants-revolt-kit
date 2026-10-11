export interface SignedUrlResponse {
  uploadUrl: string;
  publicUrl: string;
  filePath: string;
}

export interface StorageOutboundPort {
  uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string>;
  getSignedUploadUrl(fileName: string, mimeType: string): Promise<SignedUrlResponse>;
}

