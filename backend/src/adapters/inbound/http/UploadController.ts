import { Request, Response } from 'express';
import { StorageOutboundPort } from '../../../domain/ports/outbound/StorageOutboundPort';

export class UploadController {
  constructor(private storageAdapter: StorageOutboundPort) {}

  async uploadImage(req: Request, res: Response): Promise<void> {
    try {
      const files: Express.Multer.File[] = [];

      if (req.files && Array.isArray(req.files)) {
        files.push(...req.files);
      } else if (req.files && typeof req.files === 'object') {
        Object.values(req.files).forEach((fileArray) => {
          files.push(...fileArray);
        });
      } else if (req.file) {
        files.push(req.file);
      }

      if (files.length === 0) {
        res.status(400).json({ error: 'No image file uploaded' });
        return;
      }

      const imageUrls: string[] = await Promise.all(
        files.map((file) =>
          this.storageAdapter.uploadFile(file.buffer, file.originalname, file.mimetype)
        )
      );

      res.json({
        imageUrl: imageUrls[0],
        imageUrls,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
