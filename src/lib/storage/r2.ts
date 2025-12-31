/**
 * Cloudflare R2 Storage Integration
 * R2 is S3-compatible, so we use AWS SDK
 */

import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Initialize R2 client
function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 credentials not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY environment variables.",
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Upload a file to Cloudflare R2
 * @param file - File buffer
 * @param key - Object key (path) in R2 bucket
 * @param contentType - MIME type of the file
 * @returns Public URL of the uploaded file
 */
export async function uploadToR2(
  file: Buffer,
  key: string,
  contentType: string,
): Promise<string> {
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!bucketName) {
    throw new Error("R2_BUCKET_NAME environment variable is not set");
  }

  if (!publicUrl) {
    throw new Error("R2_PUBLIC_URL environment variable is not set");
  }

  const client = getR2Client();

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: file,
      ContentType: contentType,
    });

    await client.send(command);
    console.log(`[R2] Successfully uploaded file to bucket: ${bucketName}, key: ${key}`);

    // Ensure publicUrl doesn't have trailing slash
    const baseUrl = publicUrl.endsWith("/") ? publicUrl.slice(0, -1) : publicUrl;
    // Ensure key doesn't have leading slash
    const cleanKey = key.startsWith("/") ? key.slice(1) : key;
    
    // Return public URL
    const finalUrl = `${baseUrl}/${cleanKey}`;
    console.log(`[R2] Generated public URL: ${finalUrl}`);
    console.log(`[R2] R2_PUBLIC_URL config: ${publicUrl}`);
    
    // Verify URL format
    if (finalUrl.includes(".r2.cloudflarestorage.com") && !finalUrl.includes("pub-")) {
      console.warn(`[R2] WARNING: URL appears to use R2 endpoint directly. Make sure R2_PUBLIC_URL is set to a custom domain or R2 public URL (pub-*.r2.dev)`);
    }
    
    return finalUrl;
  } catch (error) {
    console.error("[R2] Upload error:", error);
    throw new Error(`Failed to upload file to R2: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Generate a unique key for a file in R2
 * @param userId - User ID
 * @param filename - Original filename
 * @returns R2 object key
 */
export function generateR2Key(userId: string, filename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = filename.split(".").pop() || "bin";
  const sanitizedFilename = `${timestamp}-${random}.${extension}`;

  // Structure: uploads/[userId]/[filename]
  return `uploads/${userId}/${sanitizedFilename}`;
}

/**
 * List all media files for a user from R2
 * @param userId - User ID
 * @returns Array of media objects with URL, key, size, and last modified date
 */
export async function listUserMedia(userId: string): Promise<Array<{
  key: string;
  url: string;
  size: number;
  lastModified: Date;
  contentType?: string;
}>> {
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!bucketName) {
    throw new Error("R2_BUCKET_NAME environment variable is not set");
  }

  if (!publicUrl) {
    throw new Error("R2_PUBLIC_URL environment variable is not set");
  }

  const client = getR2Client();
  const prefix = `uploads/${userId}/`;

  try {
    const command = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
    });

    const response = await client.send(command);
    const baseUrl = publicUrl.endsWith("/") ? publicUrl.slice(0, -1) : publicUrl;

    if (!response.Contents || response.Contents.length === 0) {
      return [];
    }

    return response.Contents.map((object) => {
      const key = object.Key || "";
      const cleanKey = key.startsWith("/") ? key.slice(1) : key;
      const url = `${baseUrl}/${cleanKey}`;

      return {
        key: key,
        url: url,
        size: object.Size || 0,
        lastModified: object.LastModified || new Date(),
        contentType: object.Key?.endsWith(".mp4") || object.Key?.endsWith(".mov")
          ? "video"
          : "image",
      };
    }).sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime()); // Sort by newest first
  } catch (error) {
    console.error("[R2] List error:", error);
    throw new Error(`Failed to list media from R2: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Delete a media file from R2
 * @param key - Object key (path) in R2 bucket
 */
export async function deleteFromR2(key: string): Promise<void> {
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!bucketName) {
    throw new Error("R2_BUCKET_NAME environment variable is not set");
  }

  const client = getR2Client();

  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await client.send(command);
    console.log(`[R2] Successfully deleted file from bucket: ${bucketName}, key: ${key}`);
  } catch (error) {
    console.error("[R2] Delete error:", error);
    throw new Error(`Failed to delete file from R2: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
