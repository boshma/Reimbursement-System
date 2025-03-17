const { s3Client, bucketName } = require('../config/s3');
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const path = require('path');

class FileUploadService {
  generateFileName(originalname) {
    // Generate a unique filename to prevent collisions
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalname);
    return `receipts/${timestamp}-${randomString}${extension}`;
  }

  async uploadReceipt(file) {
    if (!file) {
      throw new Error('No file provided');
    }

    const fileName = this.generateFileName(file.originalname);
    
    const uploadParams = {
      Bucket: bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype
    };

    try {
      await s3Client.send(new PutObjectCommand(uploadParams));
      return fileName;
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw new Error('Failed to upload receipt');
    }
  }

  async getSignedUrl(key, expirationSeconds = 3600) {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    });

    try {
      const url = await getSignedUrl(s3Client, command, { expiresIn: expirationSeconds });
      return url;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error('Failed to generate receipt URL');
    }
  }
}

module.exports = new FileUploadService();