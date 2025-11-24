"use server"

import { s3Client, BUCKET_NAME } from "@/lib/s3"
import { PutObjectCommand, CreateBucketCommand, HeadBucketCommand, PutBucketPolicyCommand, PutBucketCorsCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { auth } from "@/lib/auth"
import { v4 as uuidv4 } from "uuid"

async function ensureBucketConfig() {
  let bucketExists = false
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }))
    bucketExists = true
  } catch (error: any) {
    // 404 means bucket not found, anything else is a real error (connection, auth, etc)
    if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NotFound') {
       bucketExists = false
    } else {
       console.error("Error checking bucket existence:", error)
       // If we can't check if it exists (e.g. connection refused), we probably can't create it either.
       // But we'll try creating anyway if it might be missing.
    }
  }

  if (!bucketExists) {
    try {
      console.log(`Attempting to create bucket: ${BUCKET_NAME}`)
      await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }))
      console.log(`Bucket ${BUCKET_NAME} created successfully`)
      
      // Set bucket policy to allow public read access
      const bucketPolicy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: "*",
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`]
          }
        ]
      }
      
      await s3Client.send(new PutBucketPolicyCommand({
        Bucket: BUCKET_NAME,
        Policy: JSON.stringify(bucketPolicy)
      }))
      
      console.log("Public read policy set")
    } catch (createError) {
      console.error("Failed to create bucket or set policy:", createError)
      // Throwing here prevents generating a useless upload URL
      throw new Error(`Failed to initialize storage bucket: ${createError}`)
    }
  }

  // Always ensure CORS is configured (safe to update)
  // Note: MinIO in local development may not support CORS configuration
  try {
    await s3Client.send(new PutBucketCorsCommand({
      Bucket: BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["PUT", "POST", "GET", "HEAD"],
            AllowedOrigins: ["*"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3000
          }
        ]
      }
    }))
  } catch (corsError: any) {
    // Non-fatal, MinIO may not support CORS configuration in local dev
    if (corsError?.Code !== 'NotImplemented') {
      console.warn("Failed to set CORS:", corsError)
    }
  }
}

export async function getUploadUrlAction(contentType: string, folder: string = "evidence") {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  try {
    await ensureBucketConfig()
  } catch (error) {
    console.error("Bucket configuration failed:", error)
    throw new Error("Storage system unavailable")
  }

  const fileKey = `${folder}/${session.user.id}/${uuidv4()}`
  
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    ContentType: contentType,
  })

  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

  // Return the URL to upload to, and the public URL (or key) to store in DB
  // For MinIO/S3, the public URL depends on configuration. 
  // Locally: http://localhost:9000/bucket/key
  // R2/Prod: https://pub-xxx.r2.dev/key (if S3_APPEND_BUCKET_TO_URL is false)
  const baseUrl = process.env.NEXT_PUBLIC_S3_PUBLIC_URL || "http://localhost:9000"
  
  // Logic: 
  // 1. If using localhost (MinIO), we usually need the bucket name in the path.
  // 2. If using R2 public URL (pub-xxx.r2.dev), the bucket is already "implied" by the subdomain, BUT...
  //    The user's example shows the public URL INCLUDES the bucket name:
  //    Broken: .../market-assets/...
  //    Working: .../proph-bet/market-assets/...
  //    So for this specific R2 setup, we MUST include the bucket name.
  
  // Check if we should append the bucket. 
  // Default to TRUE if not specified, unless explicitly set to "false".
  // This overrides the previous logic that tried to be smart about localhost vs prod.
  const appendBucket = process.env.S3_APPEND_BUCKET_TO_URL !== "false"
  
  const publicUrl = appendBucket 
    ? `${baseUrl}/${BUCKET_NAME}/${fileKey}`
    : `${baseUrl}/${fileKey}`

  return { uploadUrl: url, publicUrl, fileKey }
}
