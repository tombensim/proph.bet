import { S3Client } from "@aws-sdk/client-s3"

export const s3Client = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
  forcePathStyle: true, // Needed for MinIO
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "minioadmin",
    secretAccessKey: process.env.S3_SECRET_KEY || "minioadmin",
  },
})

export const BUCKET_NAME = process.env.S3_BUCKET_NAME || "prophbet-evidence"

