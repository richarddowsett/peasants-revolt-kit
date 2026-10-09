import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { UploadController } from './UploadController';
import { StorageOutboundPort } from '../../../domain/ports/outbound/StorageOutboundPort';

describe('UploadController', () => {
  let storageAdapter: StorageOutboundPort;
  let controller: UploadController;
  let req: Partial<Request>;
  let res: Partial<Response>;

  const mockFile = (name: string): Express.Multer.File => ({
    fieldname: 'image',
    originalname: name,
    encoding: '7bit',
    mimetype: 'image/png',
    buffer: Buffer.from('fake-image-content'),
    size: 100,
    destination: '',
    filename: name,
    path: '',
    stream: null as any,
  });

  beforeEach(() => {
    storageAdapter = {
      uploadFile: vi
        .fn()
        .mockImplementation((buffer, filename) =>
          Promise.resolve(`https://storage.googleapis.com/bucket/${filename}`)
        ),
    };

    controller = new UploadController(storageAdapter);

    req = {};
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  it('should respond with 400 when no files or file properties are present', async () => {
    await controller.uploadImage(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'No image file uploaded' });
  });

  it('should respond with 400 when req.files is an empty array', async () => {
    req.files = [];

    await controller.uploadImage(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'No image file uploaded' });
  });

  it('should handle single file upload via req.file', async () => {
    const file = mockFile('shirt.png');
    req.file = file;

    await controller.uploadImage(req as Request, res as Response);

    expect(storageAdapter.uploadFile).toHaveBeenCalledWith(
      file.buffer,
      'shirt.png',
      'image/png'
    );
    expect(res.json).toHaveBeenCalledWith({
      imageUrl: 'https://storage.googleapis.com/bucket/shirt.png',
      imageUrls: ['https://storage.googleapis.com/bucket/shirt.png'],
    });
  });

  it('should handle multiple file upload via req.files array', async () => {
    const file1 = mockFile('front.png');
    const file2 = mockFile('back.png');
    req.files = [file1, file2] as any;

    await controller.uploadImage(req as Request, res as Response);

    expect(storageAdapter.uploadFile).toHaveBeenCalledTimes(2);
    expect(storageAdapter.uploadFile).toHaveBeenNthCalledWith(
      1,
      file1.buffer,
      'front.png',
      'image/png'
    );
    expect(storageAdapter.uploadFile).toHaveBeenNthCalledWith(
      2,
      file2.buffer,
      'back.png',
      'image/png'
    );
    expect(res.json).toHaveBeenCalledWith({
      imageUrl: 'https://storage.googleapis.com/bucket/front.png',
      imageUrls: [
        'https://storage.googleapis.com/bucket/front.png',
        'https://storage.googleapis.com/bucket/back.png',
      ],
    });
  });

  it('should handle file upload when req.files is an object dictionary of file arrays', async () => {
    const file1 = mockFile('hero.png');
    const file2 = mockFile('thumb.png');
    req.files = {
      heroImage: [file1],
      thumbnails: [file2],
    } as any;

    await controller.uploadImage(req as Request, res as Response);

    expect(storageAdapter.uploadFile).toHaveBeenCalledTimes(2);
    expect(res.json).toHaveBeenCalledWith({
      imageUrl: 'https://storage.googleapis.com/bucket/hero.png',
      imageUrls: [
        'https://storage.googleapis.com/bucket/hero.png',
        'https://storage.googleapis.com/bucket/thumb.png',
      ],
    });
  });

  it('should respond with status 500 when storage upload throws an error', async () => {
    req.file = mockFile('bad.png');
    vi.mocked(storageAdapter.uploadFile).mockRejectedValueOnce(
      new Error('Storage service unavailable')
    );

    await controller.uploadImage(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Storage service unavailable' });
  });
});
