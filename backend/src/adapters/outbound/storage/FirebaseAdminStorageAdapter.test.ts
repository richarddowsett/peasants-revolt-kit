import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetSignedUrl, mockSave, mockBucket } = vi.hoisted(() => {
  const mockGetSignedUrl = vi.fn();
  const mockSave = vi.fn();
  const mockFile = vi.fn(() => ({
    getSignedUrl: mockGetSignedUrl,
    save: mockSave,
  }));
  const mockBucket = vi.fn(() => ({
    file: mockFile,
    name: 'test-bucket',
  }));

  return { mockGetSignedUrl, mockSave, mockBucket };
});

vi.mock('../db/FirebaseAdminConfig', () => ({
  adminStorage: {
    bucket: mockBucket,
  },
}));

import { FirebaseAdminStorageAdapter } from './FirebaseAdminStorageAdapter';

describe('FirebaseAdminStorageAdapter', () => {
  let adapter: FirebaseAdminStorageAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new FirebaseAdminStorageAdapter();
  });

  it('generates a signed upload URL', async () => {
    mockGetSignedUrl.mockResolvedValueOnce(['https://signed.upload.url']);

    const result = await adapter.getSignedUploadUrl('my test file!.png', 'image/png');

    expect(result.uploadUrl).toBe('https://signed.upload.url');
    expect(result.publicUrl).toContain('https://storage.googleapis.com/test-bucket/product-images/');
    expect(result.filePath).toContain('my_test_file_.png');
  });

  it('uploads a file buffer directly', async () => {
    mockSave.mockResolvedValueOnce(undefined);

    const buffer = Buffer.from('fake image content');
    const publicUrl = await adapter.uploadFile(buffer, 'photo.jpg', 'image/jpeg');

    expect(mockSave).toHaveBeenCalledWith(buffer, {
      metadata: { contentType: 'image/jpeg' },
    });
    expect(publicUrl).toContain('https://storage.googleapis.com/test-bucket/product-images/');
  });
});
