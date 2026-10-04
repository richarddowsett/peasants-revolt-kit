export interface StoragePort {
  uploadImage(file: File, folderPath?: string): Promise<string>;
}
