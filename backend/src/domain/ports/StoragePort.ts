export interface StoragePort {
  uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string>;
}
