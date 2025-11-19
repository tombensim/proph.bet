"use server"

import { s3Client, BUCKET_NAME } from "@/lib/s3"
import { PutObjectCommand, CreateBucketCommand, HeadBucketCommand, PutBucketPolicyCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { auth } from "@/lib/auth"
import { v4 as uuidv4 } from "uuid"

async function ensureBucketExists() {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }))
  } catch (error) {
    // Bucket doesn't exist, create it
    try {
      await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }))
      
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
      
      console.log("Bucket created and public read policy set")
    } catch (createError) {
      console.error("Failed to create bucket or set policy:", createError)
    }
  }
}

export async function getUploadUrlAction(contentType: string, folder: string = "evidence") {
  const session = await auth()
  if (!session?.user) throw new Error("Unauthorized")

  await ensureBucketExists()

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
  const appendBucket = process.env.S3_APPEND_BUCKET_TO_URL !== "false" && (process.env.S3_ENDPOINT?.includes("localhost") || baseUrl.includes("localhost"))
  
  const publicUrl = appendBucket 
    ? `${baseUrl}/${BUCKET_NAME}/${fileKey}`
    : `${baseUrl}/${fileKey}`

  return { uploadUrl: url, publicUrl, fileKey }
}

