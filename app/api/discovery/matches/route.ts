import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import Like from '@/models/Like';
import { verifyAuth } from '@/lib/auth';

// Get potential matches for discovery
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    // Verify authentication
    const { userId } = verifyAuth(request);

    // Get current user to access their preferences
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build filter based on user preferences
    const filter: any = {
      _id: { $ne: userId }, // Exclude current user
      isActive: true
    };

    // Filter by gender preference
    if (currentUser.preferences?.genderPreference && currentUser.preferences.genderPreference !== 'all') {
      filter.gender = currentUser.preferences.genderPreference;
    }

    // Filter by age range
    if (currentUser.preferences?.ageRange) {
      const currentYear = new Date().getFullYear();
      const minBirthYear = currentYear - currentUser.preferences.ageRange.max;
      const maxBirthYear = currentYear - currentUser.preferences.ageRange.min;
      
      filter.dateOfBirth = {
        $gte: new Date(minBirthYear, 0, 1),
        $lte: new Date(maxBirthYear, 11, 31)
      };
    }

    // Get users who haven't been liked/passed by current user
    const existingInteractions = await Like.find({ 
      fromUserId: userId 
    }).select('toUserId');
    
    const interactedUserIds = existingInteractions.map(like => like.toUserId);
    if (interactedUserIds.length > 0) {
      filter._id = { ...filter._id, $nin: interactedUserIds };
    }

    // Get potential matches from database
    const users = await User.find(filter)
      .select('firstName age location bio interests photos verification')
      .skip(offset)
      .limit(limit)
      .lean();

    // Calculate compatibility based on shared interests
    const currentUserInterests = Array.isArray(currentUser.interests) ? currentUser.interests : [];
    const formattedUsers = users.map(user => {
      const candidateInterests = Array.isArray(user.interests) ? user.interests : [];
      const sharedInterests = candidateInterests.filter((interest: string) => currentUserInterests.includes(interest));
      const compatibilityScore = candidateInterests.length > 0
        ? Math.round((sharedInterests.length / candidateInterests.length) * 100)
        : 0;
      return {
        id: user._id,
        firstName: user.firstName,
        age: user.dateOfBirth ? Math.floor((new Date().getTime() - new Date(user.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null,
        location: user.location,
        bio: user.bio,
        interests: user.interests,
        photos: user.photos,
        verification: user.verification,
        compatibilityScore,
        commonInterests: sharedInterests.slice(0, 3)
      };
    });

    return NextResponse.json(
      {
        matches: formattedUsers,
        hasMore: users.length === limit,
        totalShown: offset + users.length
      },
      {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  } catch (error: unknown) {
    console.error('Get matches error:', error);

    if (error instanceof Error && (error.message === 'Authentication token is required' || error.message === 'Invalid or expired token')) {
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