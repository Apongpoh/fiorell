import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

type ProfileParams = {
  params: { id: string };
};

export async function GET(
  request: NextRequest,
  context: ProfileParams
): Promise<NextResponse> {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    // Check if requested profile exists
    const { id } = context.params;

    const user = await User.findById(id)
      .select('firstName dateOfBirth photos location bio interests verification lastSeen');

    if (!user) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Calculate age from dateOfBirth
    const age = user.dateOfBirth 
      ? Math.floor((Date.now() - new Date(user.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
      : null;

    // Format the response
    const formattedUser = {
      id: user._id,
      firstName: user.firstName,
      age,
      photos: user.photos,
      location: user.location,
      bio: user.bio,
      interests: user.interests || [],
      verification: user.verification || { isVerified: false },
      lastSeen: user.lastSeen
    };

    return NextResponse.json({ user: formattedUser });

  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}