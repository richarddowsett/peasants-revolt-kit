export interface StorageOutboundPort {
  uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string>;
}
