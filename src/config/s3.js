const { S3Client } = require('@aws-sdk/client-s3');

const s3Client = new S3Client();

module.exports = {
  s3Client,
  bucketName: process.env.S3_BUCKET_NAME
};