import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from '@/lib/aws';
import connectToDatabase from '@/lib/mongodb';
import Match from '@/models/Match';
import Message from '@/models/Message';
import { verifyAuth } from '@/lib/auth';

// Basic per-match media throttle & duplicate detection
const recentMedia: Map<string, { size: number; mime: string; ts: number }> = new Map();
const MEDIA_RATE_WINDOW_MS = 5000; // at most one media every 5s per user per match
const ALLOWED_IMAGE_TYPES = ['image/jpeg','image/png','image/webp','image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4','video/quicktime','video/webm'];

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const matchId = formData.get('matchId') as string;

    if (!file || !matchId) {
      return NextResponse.json(
        { error: 'File and matchId are required' },
        { status: 400 }
      );
    }

    // Verify user is part of this match
    const match = await Match.findOne({
      _id: matchId,
      $or: [{ user1: userId }, { user2: userId }],
      status: 'matched',
      isActive: true
    });

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found or unauthorized' },
        { status: 404 }
      );
    }

    // Get file details
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileType = file.type;
    const fileSize = file.size;

    // Validate file type strictly
    const isImage = ALLOWED_IMAGE_TYPES.includes(fileType);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(fileType);
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: 'Unsupported media type. Allowed images: jpg, png, webp, gif. Allowed video: mp4, mov, webm.' },
        { status: 400 }
      );
    }

    // Maximum file size (10MB images, 25MB videos)
    const maxSize = isVideo ? 25 * 1024 * 1024 : 10 * 1024 * 1024;
    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${isVideo ? '25MB for video' : '10MB for images'}.` },
        { status: 400 }
      );
    }

    // Rate limiting & duplicate guard
  const throttleKey = `${userId}:${matchId}`;
    const now = Date.now();
  const last = recentMedia.get(throttleKey);
    if (last) {
      if (now - last.ts < MEDIA_RATE_WINDOW_MS) {
        return NextResponse.json(
          { error: 'You are sending media too quickly. Please wait a few seconds.' },
          { status: 429 }
        );
      }
      if (last.size === fileSize && last.mime === fileType && (now - last.ts) < 60_000) {
        return NextResponse.json(
          { error: 'Duplicate media upload detected' },
          { status: 409 }
        );
      }
    }
  recentMedia.set(throttleKey, { size: fileSize, mime: fileType, ts: now });

    // (Optional) basic heuristic dimension check for images (skip for videos)
    // Could parse via sharp if added, but keep lightweight for now.

    // Ensure bucket env var exists (align with aws.ts usage AWS_S3_BUCKET_NAME)
    const bucket = process.env.AWS_S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME;
    if (!bucket) {
      console.error('Missing AWS_S3_BUCKET_NAME (or AWS_BUCKET_NAME) environment variable');
      return NextResponse.json(
        { error: 'Server misconfiguration: bucket not set' },
        { status: 500 }
      );
    }

    // Generate unique key for S3 (handle files without extension)
    const originalParts = file.name ? file.name.split('.') : [];
    const extension = originalParts.length > 1 ? originalParts.pop() : 'bin';
  const objectKey = `messages/${matchId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

    // Upload to S3
    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: buffer,
      ContentType: fileType
    });
    await s3Client.send(putCommand);

    // Generate a GET signed URL (so client can display the media). Use GetObjectCommand.
  const getCommand = new GetObjectCommand({ Bucket: bucket, Key: objectKey });
    const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

    // Create message record
    const message = await Message.create({
      match: matchId,
      sender: userId,
      recipient: match.user1.toString() === userId ? match.user2 : match.user1,
      type: fileType.startsWith('image/') ? 'image' : 'video',
      media: {
        url, // temporary signed URL (expires). Consider storing key and generating on demand client-side.
        key: objectKey,
        mimeType: fileType,
        size: fileSize
      },
      readStatus: { isRead: false }
    });

    // Update match lastMessageAt
    await Match.findByIdAndUpdate(matchId, {
      lastMessageAt: new Date()
    });

    return NextResponse.json(
      { message },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Upload media error:', error);

    if (error.message === 'Authentication token is required' || error.message === 'Invalid or expired token') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}