import { StoragePort } from '@/domain/ports/StoragePort';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export class FirebaseStorageAdapter implements StoragePort {
  async uploadImage(file: File, folderPath: string = 'product-images'): Promise<string> {
    const uniqueFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    try {
      if (storage) {
        const storageRef = ref(storage, `${folderPath}/${uniqueFileName}`);
        await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(storageRef);
        return downloadUrl;
      }
    } catch (err) {
      console.warn('Firebase Storage upload notice, using local data URL fallback:', err);
    }

    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(file);
    });
  }
}
