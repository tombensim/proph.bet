import { NextRequest } from "next/server"
import { validateApiRequest, apiResponse, apiError } from "@/lib/api-auth"
import { s3Client, BUCKET_NAME } from "@/lib/s3"
import { PutObjectCommand, CreateBucketCommand, HeadBucketCommand, PutBucketPolicyCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { v4 as uuidv4 } from "uuid"

async function ensureBucketExists() {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }))
  } catch (error: any) {
    if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NotFound') {
      // Create bucket
      await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }))
      
      // Set public read policy
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
    }
  }
}

/**
 * POST /api/v1/storage/upload-url
 * Get a pre-signed URL for uploading files
 */
export async function POST(req: NextRequest) {
  const auth = await validateApiRequest(req)
  
  if ("error" in auth) {
    return auth.error
  }

  try {
    const body = await req.json()
    const { contentType, folder = "market-assets" } = body

    if (!contentType) {
      return apiError("Content type is required", 400)
    }

    await ensureBucketExists()

    const fileKey = `${folder}/${auth.user.id}/${uuidv4()}`
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })

    const baseUrl = process.env.NEXT_PUBLIC_S3_PUBLIC_URL || "http://localhost:9000"
    const appendBucket = process.env.S3_APPEND_BUCKET_TO_URL !== "false"
    
    const publicUrl = appendBucket 
      ? `${baseUrl}/${BUCKET_NAME}/${fileKey}`
      : `${baseUrl}/${fileKey}`

    return apiResponse({ uploadUrl, publicUrl, fileKey })
  } catch (error) {
    console.error("Upload URL generation error:", error)
    return apiError("Failed to generate upload URL", 500)
  }
}

