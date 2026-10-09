import { Request, Response } from 'express';
import { StorageOutboundPort } from '../../../domain/ports/outbound/StorageOutboundPort';

export class UploadController {
  constructor(private storageAdapter: StorageOutboundPort) {}

  async uploadImage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No image file uploaded' });
        return;
      }
      const imageUrl = await this.storageAdapter.uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
      res.json({ imageUrl });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
}
