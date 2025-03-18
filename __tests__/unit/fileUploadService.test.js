const fileUploadService = require('../../src/services/fileUploadService');
const { s3Client } = require('../../src/config/s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn()
    })),
    PutObjectCommand: jest.fn().mockImplementation(params => ({
      params,
      constructor: { name: 'PutObjectCommand' }
    })),
    GetObjectCommand: jest.fn().mockImplementation(params => ({
      params,
      constructor: { name: 'GetObjectCommand' }
    }))
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn()
}));

jest.mock('../../src/config/s3', () => ({
  s3Client: {
    send: jest.fn()
  },
  bucketName: 'test-bucket'
}));

describe('FileUploadService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadReceipt', () => {
    test('should upload a file and return the filename', async () => {
      const mockFile = {
        originalname: 'receipt.jpg',
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg'
      };

      s3Client.send.mockResolvedValue({});

      const result = await fileUploadService.uploadReceipt(mockFile);

      expect(result).toMatch(/^receipts\/\d+-[a-f0-9]{16}\.jpg$/);
      expect(s3Client.send).toHaveBeenCalledTimes(1);
    });

    test('should throw an error if no file is provided', async () => {
      await expect(fileUploadService.uploadReceipt(null))
        .rejects.toThrow('No file provided');

      expect(s3Client.send).not.toHaveBeenCalled();
    });

    test('should throw an error if upload fails', async () => {
      const mockFile = {
        originalname: 'receipt.jpg',
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg'
      };

      s3Client.send.mockRejectedValue(new Error('S3 error'));

      await expect(fileUploadService.uploadReceipt(mockFile))
        .rejects.toThrow('Failed to upload receipt');
    });
  });

  describe('uploadProfilePicture', () => {
    test('should upload a profile picture and return the filename', async () => {
      const mockFile = {
        originalname: 'profile.jpg',
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg'
      };

      s3Client.send.mockResolvedValue({});

      const result = await fileUploadService.uploadProfilePicture(mockFile);
      
      expect(result).toMatch(/^profiles\/\d+-[a-f0-9]{16}\.jpg$/);
      expect(s3Client.send).toHaveBeenCalledTimes(1);
      
      expect(result.startsWith('profiles/')).toBe(true);
    });

    test('should throw an error if no file is provided', async () => {
      await expect(fileUploadService.uploadProfilePicture(null))
        .rejects.toThrow('No file provided');

      expect(s3Client.send).not.toHaveBeenCalled();
    });

    test('should throw an error if upload fails', async () => {
      const mockFile = {
        originalname: 'profile.jpg',
        buffer: Buffer.from('test'),
        mimetype: 'image/jpeg'
      };

      s3Client.send.mockRejectedValue(new Error('S3 error'));

      await expect(fileUploadService.uploadProfilePicture(mockFile))
        .rejects.toThrow('Failed to upload profiles');
    });
  });

  describe('getSignedUrl', () => {
    test('should return a signed URL for a file key', async () => {
      const mockKey = 'receipts/test.jpg';
      const mockUrl = 'https://s3.example.com/signed-url';

      getSignedUrl.mockResolvedValue(mockUrl);

      const result = await fileUploadService.getSignedUrl(mockKey);

      expect(result).toBe(mockUrl);
      expect(getSignedUrl).toHaveBeenCalledWith(
        s3Client,
        expect.any(Object),
        { expiresIn: 3600 }
      );
    });

    test('should throw an error if URL generation fails', async () => {
      const mockKey = 'receipts/test.jpg';

      getSignedUrl.mockRejectedValue(new Error('Presigner error'));

      await expect(fileUploadService.getSignedUrl(mockKey))
        .rejects.toThrow('Failed to generate URL');
    });

    test('should return null if key is null', async () => {
      const result = await fileUploadService.getSignedUrl(null);

      expect(result).toBeNull();
      expect(getSignedUrl).not.toHaveBeenCalled();
    });
  });
});