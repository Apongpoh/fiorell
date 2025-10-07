import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "@/lib/aws";
import connectToDatabase from "@/lib/mongodb";
import { verifyAuth, verifyToken } from "@/lib/auth";
import Message from "@/models/Message";
import logger from "@/lib/logger";

// GET /api/messages/media/refresh?key=... -> returns a fresh signed URL for a media object
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    let userId: string | null = null;
    try {
      const { userId: uid } = verifyAuth(request);
      userId = uid;
    } catch {
      // Fallback: accept token in query (?token=...) similar to subscribe endpoint
      const tokenParam = searchParams.get("token");
      if (tokenParam) {
        try {
          const { userId: uid2 } = verifyToken(tokenParam);
          userId = uid2;
        } catch {}
      }
    }
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const key = searchParams.get("key");
    if (!key) {
      return NextResponse.json(
        { error: "Missing key parameter" },
        { status: 400 }
      );
    }

    const bucket =
      process.env.AWS_S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME;
    if (!bucket) {
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    // Ensure the requesting user is either sender or recipient of a message holding this key
    const message = await Message.findOne({
      "media.key": key,
      $or: [{ sender: userId }, { recipient: userId }],
    }).select("media.key");
    if (!message) {
      return NextResponse.json(
        { error: "Not found or unauthorized" },
        { status: 404 }
      );
    }

    const getCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
    const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
    return NextResponse.json({ url });
  } catch (error: unknown) {
    logger.error("Refresh media URL error:", {
      action: "refresh_media_url_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    let message = "Failed to refresh media";
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message: unknown }).message === "string"
    ) {
      message = (error as { message: string }).message;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
