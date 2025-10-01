import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';
import { deleteFileFromS3 } from '@/lib/aws';
import { uploadFileToS3 } from '@/lib/aws';
// import { Formidable, Fields, Files } from 'formidable';

export const config = {
  api: {
    bodyParser: false,
  },
};

// Upload profile photo

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has reached photo limit (max 6 photos)
    if (user.photos.length >= 6) {
      return NextResponse.json(
        { error: 'Maximum 6 photos allowed' },
        { status: 400 }
      );
    }

    // Get files from FormData
    const formData = await request.formData();
    const files: File[] = [];
    for (const entry of formData.entries()) {
      const [key, value] = entry;
      if ((key === 'photo' || key === 'photos') && value instanceof File) {
        files.push(value);
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files uploaded' },
        { status: 400 }
      );
    }

    // Enforce max 6 photos
    if (user.photos.length + files.length > 6) {
      return NextResponse.json(
        { error: 'Maximum 6 photos allowed' },
        { status: 400 }
      );
    }

    const uploadedPhotos = [];
    const MAX_SIZE_MB = 5;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) {
        continue; // skip non-image files
      }
      if (file.size > MAX_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File size exceeds ${MAX_SIZE_MB}MB limit.` },
          { status: 400 }
        );
      }
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const s3Result = await uploadFileToS3(buffer, file.name, file.type);
      const newPhoto = {
        url: s3Result.location,
        key: s3Result.key,
        isMain: user.photos.length === 0 && i === 0,
        createdAt: new Date()
      };
      user.photos.push(newPhoto);
      uploadedPhotos.push(newPhoto);
    }
    await user.save();

    return NextResponse.json(
      {
        message: 'Photo(s) uploaded successfully',
        photos: uploadedPhotos
      },
      { status: 201 }
    );

  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null) {
      const errObj = error as { message?: string };
      if (errObj.message === 'Authentication token is required' || errObj.message === 'Invalid or expired token') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      if (errObj.message && (errObj.message.includes('file type') || errObj.message.includes('file size'))) {
        return NextResponse.json(
          { error: errObj.message },
          { status: 400 }
        );
      }
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete profile photo
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    let photoId: string | null = null;
    if (request.headers.get('content-type')?.includes('application/json')) {
      try {
        const body = await request.json();
        photoId = body.photoId;
      } catch {
        // If body is empty, fallback to query param
        const { searchParams } = new URL(request.url);
        photoId = searchParams.get('photoId');
      }
    } else {
      const { searchParams } = new URL(request.url);
      photoId = searchParams.get('photoId');
    }

    if (!photoId) {
      return NextResponse.json(
        { error: 'Photo ID is required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find photo
  const photoIndex = user.photos.findIndex((photo: { _id?: unknown }) => String(photo._id) === photoId);
    if (photoIndex === -1) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      );
    }

    const photo = user.photos[photoIndex];

    // Delete from S3
    try {
      await deleteFileFromS3(photo.key);
    } catch (s3Error) {
      console.error('S3 delete error:', s3Error);
      // Continue with database deletion even if S3 deletion fails
    }

    // Remove photo from user's photos array
    user.photos.splice(photoIndex, 1);

    // If deleted photo was main photo, set new main photo
    if (photo.isMain && user.photos.length > 0) {
      user.photos[0].isMain = true;
    }

    await user.save();

    return NextResponse.json(
      { message: 'Photo deleted successfully' },
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error('Delete photo error:', error);
    if (typeof error === 'object' && error !== null) {
      const errObj = error as { message?: string };
      if (errObj.message === 'Authentication token is required' || errObj.message === 'Invalid or expired token') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Set main photo
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    const body = await request.json();
    const { photoId } = body;

    if (!photoId) {
      return NextResponse.json(
        { error: 'Photo ID is required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Find photo
  const photo = user.photos.find((p: { _id?: unknown }) => String(p._id) === photoId);
    if (!photo) {
      return NextResponse.json(
        { error: 'Photo not found' },
        { status: 404 }
      );
    }

    // Update main photo
    user.photos.forEach((p: { _id?: unknown; isMain?: boolean }) => {
      p.isMain = String(p._id) === photoId;
    });

    await user.save();

    return NextResponse.json(
      { message: 'Main photo updated successfully' },
      { status: 200 }
    );

  } catch (error: unknown) {
    console.error('Set main photo error:', error);
    if (typeof error === 'object' && error !== null) {
      const errObj = error as { message?: string };
      if (errObj.message === 'Authentication token is required' || errObj.message === 'Invalid or expired token') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}