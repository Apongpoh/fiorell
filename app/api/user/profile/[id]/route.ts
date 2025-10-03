import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import { computeProfileCompletion } from '@/lib/profileCompletion';

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
      .select('firstName dateOfBirth photos location bio interests verification lastSeen lifestyle stats');

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

    const completion = computeProfileCompletion(user as any);

    // Compute mutual interests with viewer (if different user)
    let mutualInterests: string[] = [];
    if (userId && userId.toString() !== id.toString()) {
      try {
        const viewer = await User.findById(userId).select('interests');
        if (viewer?.interests && user.interests) {
          const viewerSet = new Set(viewer.interests.map((i: string) => i.toLowerCase()));
          mutualInterests = user.interests.filter((i: string) => viewerSet.has(i.toLowerCase()));
        }
      } catch {}
    }

    // Derive aggregate like counts
    const totalLikes = (user as any).stats?.totalLikesReceived || 0;
    const totalSuperLikes = (user as any).stats?.totalSuperLikesReceived || 0;
    const totalMatches = (user as any).stats?.totalMatches || 0;
    const profileViews = (user as any).stats?.profileViews || 0;

    // Format the response including completion & score
    const formattedUser = {
      id: user._id,
      firstName: user.firstName,
      age,
      photos: user.photos,
      location: user.location,
      bio: user.bio,
      interests: user.interests || [],
      verification: user.verification || { isVerified: false },
      lastSeen: user.lastSeen,
      lifestyle: user.lifestyle || null,
      stats: {
        profileCompleteness: completion.percentage,
        profileScore: completion.score,
        profileBreakdown: completion.breakdown,
        totalLikes,
        totalSuperLikes,
        totalMatches,
        profileViews,
        mutualInterests,
        mutualInterestsCount: mutualInterests.length
      }
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