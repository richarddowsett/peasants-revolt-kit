import { Request, Response } from 'express';
import { StorageOutboundPort } from '../../../domain/ports/outbound/StorageOutboundPort';
import { ErrorAlertOutboundPort } from '../../../domain/ports/outbound/ErrorAlertOutboundPort';
import { isErrorAlreadyAlerted } from '../../outbound/observability/ErrorObservabilityAdapter';

export class UploadController {
  constructor(
    private storageAdapter: StorageOutboundPort,
    private errorAlertPort?: ErrorAlertOutboundPort
  ) {}

  async getSignedUploadUrl(req: Request, res: Response): Promise<void> {
    try {
      const { fileName, contentType } = req.body || {};

      if (!fileName || typeof fileName !== 'string' || fileName.trim() === '') {
        res.status(400).json({ error: 'Missing or invalid fileName' });
        return;
      }

      if (!contentType || typeof contentType !== 'string' || !contentType.startsWith('image/')) {
        res.status(400).json({ error: 'Missing or invalid image contentType' });
        return;
      }

      const result = await this.storageAdapter.getSignedUploadUrl(fileName.trim(), contentType.trim());
      res.json(result);
    } catch (err: unknown) {
      const message = (err as Error).message || 'Failed to generate signed upload URL';
      if (this.errorAlertPort && !isErrorAlreadyAlerted(err)) {
        await this.errorAlertPort.reportError({
          category: 'ADMIN_ACTION_FAILURE',
          operation: 'POST /api/upload/signed-url',
          errorMessage: message,
          stack: (err as Error).stack,
          httpStatus: 500,
          metadata: {
            fileName: req.body?.fileName,
            contentType: req.body?.contentType,
          },
        });
      }
      res.status(500).json({ error: message });
    }
  }

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
    } catch (err: unknown) {
      const message = (err as Error).message;
      if (this.errorAlertPort && !isErrorAlreadyAlerted(err)) {
        await this.errorAlertPort.reportError({
          category: 'ADMIN_ACTION_FAILURE',
          operation: 'POST /api/upload',
          errorMessage: message,
          stack: (err as Error).stack,
          httpStatus: 500,
        });
      }
      res.status(500).json({ error: message });
    }
  }
}
