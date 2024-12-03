/** 
 * AWS Configuration for S3 and Rekognition services
 */
const AWS = require('aws-sdk');

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

const rekognition = new AWS.Rekognition({
  region: 'us-east-1',
});

module.exports = { s3, rekognition };

// module.exports = s3;