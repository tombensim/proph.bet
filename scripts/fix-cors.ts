import dotenv from "dotenv";
/**
 * S3/R2 CORS Configuration Script
 * 
 * WHEN TO USE:
 * Use this script when users encounter CORS (Cross-Origin Resource Sharing) errors 
 * during file uploads. This typically manifests as:
 * - "Access to fetch at '...' has been blocked by CORS policy"
 * - "No 'Access-Control-Allow-Origin' header is present"
 * - Upload failures in the browser console
 * 
 * This often happens when:
 * 1. Setting up a new R2/S3 bucket
 * 2. Moving from development (localhost) to production
 * 3. Changing the domain of the application
 * 
 * HOW TO USE:
 * 1. Ensure you have the correct production credentials in `.env.local`:
 *    - S3_ACCESS_KEY
 *    - S3_SECRET_KEY
 *    - S3_ENDPOINT
 *    - S3_BUCKET_NAME
 * 
 * 2. Run the script:
 *    npx tsx scripts/fix-cors.ts
 * 
 * 3. Verify the output shows "Successfully updated CORS configuration"
 */

// Load env vars before importing s3 client
dotenv.config({ path: ".env.local" });
dotenv.config(); 

import { s3Client, BUCKET_NAME } from "../lib/s3";
import { PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";

async function fixCors() {
  console.log("----------------------------------------");
  console.log(`Configuring CORS for bucket: ${BUCKET_NAME}`);
  console.log(`Endpoint: ${process.env.S3_ENDPOINT || 'Not set'}`);
  console.log("----------------------------------------");

  if (!process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY) {
    console.error("❌ Missing S3_ACCESS_KEY or S3_SECRET_KEY environment variables.");
    console.error("Please ensure .env.local has the correct production credentials.");
    process.exit(1);
  }

  try {
    // First, try to get existing CORS
    try {
      const current = await s3Client.send(new GetBucketCorsCommand({ Bucket: BUCKET_NAME }));
      console.log("Current CORS Rules:", JSON.stringify(current.CORSRules, null, 2));
    } catch (e: any) {
      console.log("Could not fetch current CORS rules (might be empty or denied):", e.message);
    }

    console.log("Applying new CORS configuration...");
    const command = new PutBucketCorsCommand({
      Bucket: BUCKET_NAME,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["PUT", "POST", "GET", "HEAD", "DELETE"],
            AllowedOrigins: ["*"], // Allow all origins for now to fix the error
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3600
          }
        ]
      }
    });

    await s3Client.send(command);
    console.log("✅ Successfully updated CORS configuration.");
    
    // Verify
    console.log("Verifying new configuration...");
    const updated = await s3Client.send(new GetBucketCorsCommand({ Bucket: BUCKET_NAME }));
    console.log("Updated CORS Rules:", JSON.stringify(updated.CORSRules, null, 2));

  } catch (error: any) {
    console.error("❌ Error updating CORS configuration:", error);
    if (error.$metadata) {
      console.error("Error Metadata:", error.$metadata);
    }
  }
}

fixCors();
