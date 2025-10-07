import {
  S3Client,
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "@/lib/logger";

// Configure AWS S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Function to delete file from S3
export const deleteFileFromS3 = async (key: string): Promise<void> => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
    });
    await s3Client.send(command);
  } catch (error) {
    logger.error("Error deleting file from S3:", {
      action: "s3_delete_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        key,
      },
    });
    throw new Error("Failed to delete file from S3");
  }
};

// Function to generate presigned URL for private files
export const generatePresignedUrl = async (
  key: string,
  expiresIn: number = 3600
): Promise<string> => {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
    });
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    logger.error("Error generating presigned URL:", {
      action: "s3_presign_url_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        key,
      },
    });
    throw new Error("Failed to generate presigned URL");
  }
};

// Function to check if file exists in S3
export const checkFileExists = async (key: string): Promise<boolean> => {
  try {
    const command = new HeadObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: key,
    });
    await s3Client.send(command);
    return true;
  } catch {
    return false;
  }
};

// Upload file to S3 using AWS SDK v3
export const uploadFileToS3 = async (
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<{ location: string; key: string }> => {
  const key = `profile-photos/${Date.now()}-${filename}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  const location = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  return { location, key };
};

export { s3Client };
