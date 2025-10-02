import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from '@/lib/aws';
import connectToDatabase from '@/lib/mongodb';
import Match from '@/models/Match';
import Message from '@/models/Message';
import { verifyAuth } from '@/lib/auth';

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

    // Validate file
    if (!fileType.startsWith('image/') && !fileType.startsWith('video/')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images and videos are allowed.' },
        { status: 400 }
      );
    }

    // Maximum file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

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
    const key = `messages/${matchId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

    // Upload to S3
    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: fileType
    });
    await s3Client.send(putCommand);

    // Generate a GET signed URL (so client can display the media). Use GetObjectCommand.
    const getCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
    const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

    // Create message record
    const message = await Message.create({
      match: matchId,
      sender: userId,
      recipient: match.user1.toString() === userId ? match.user2 : match.user1,
      type: fileType.startsWith('image/') ? 'image' : 'video',
      media: {
        url, // temporary signed URL (expires). Consider storing key and generating on demand client-side.
        key,
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