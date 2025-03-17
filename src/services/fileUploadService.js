const { s3Client, bucketName } = require('../config/s3');
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const path = require('path');

class FileUploadService {
  generateFileName(originalname, fileType = 'receipts') {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalname);
    return `${fileType}/${timestamp}-${randomString}${extension}`;
  }

  async uploadFile(file, fileType = 'receipts') {
    if (!file) {
      throw new Error('No file provided');
    }

    const fileName = this.generateFileName(file.originalname, fileType);
    
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
      console.error(`Error uploading ${fileType} to S3:`, error);
      throw new Error(`Failed to upload ${fileType}`);
    }
  }

  async uploadReceipt(file) {
    return this.uploadFile(file, 'receipts');
  }

  async uploadProfilePicture(file) {
    return this.uploadFile(file, 'profiles');
  }

  async getSignedUrl(key, expirationSeconds = 3600) {
    if (!key) return null;
    
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    });

    try {
      const url = await getSignedUrl(s3Client, command, { expiresIn: expirationSeconds });
      return url;
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error('Failed to generate URL');
    }
  }
}

module.exports = new FileUploadService();