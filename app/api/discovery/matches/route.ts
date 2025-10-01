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

    // If no users found in database, return mock profiles
    if (users.length === 0) {
    const mockProfiles = [
      {
        id: 'profile-1',
        firstName: 'Emma',
        age: 28,
        location: { city: 'New York' },
        bio: 'Adventure seeker and coffee lover. Looking for someone to explore the city with!',
        interests: ['Photography', 'Travel', 'Coffee', 'Hiking', 'Art', 'Yoga'],
        photos: [
          { url: '/api/placeholder?width=400&height=600', isMain: true },
          { url: '/api/placeholder?width=400&height=600', isMain: false },
          { url: '/api/placeholder?width=400&height=600', isMain: false }
        ],
        verification: { isVerified: true },
        compatibilityScore: 85,
        commonInterests: ['Photography', 'Travel']
      },
      {
        id: 'profile-2',
        firstName: 'Sarah',
        age: 26,
        location: { city: 'Brooklyn' },
        bio: 'Artist and designer passionate about creating beautiful spaces.',
        interests: ['Art', 'Design', 'Dogs', 'Wine', 'Music', 'Reading'],
        photos: [
          { url: '/api/placeholder?width=400&height=600', isMain: true },
          { url: '/api/placeholder?width=400&height=600', isMain: false }
        ],
        verification: { isVerified: false },
        compatibilityScore: 78,
        commonInterests: ['Art']
      },
      {
        id: 'profile-3',
        firstName: 'Michael',
        age: 32,
        location: { city: 'Manhattan' },
        bio: 'Software engineer by day, musician by night. Love coding and playing guitar.',
        interests: ['Music', 'Technology', 'Food', 'Rock Climbing', 'Gaming'],
        photos: [
          { url: '/api/placeholder?width=400&height=600', isMain: true },
          { url: '/api/placeholder?width=400&height=600', isMain: false },
          { url: '/api/placeholder?width=400&height=600', isMain: false },
          { url: '/api/placeholder?width=400&height=600', isMain: false }
        ],
        verification: { isVerified: true },
        compatibilityScore: 92,
        commonInterests: ['Technology', 'Music']
      },
      {
        id: 'profile-4',
        firstName: 'Jessica',
        age: 29,
        location: { city: 'Queens' },
        bio: 'Fitness enthusiast and food blogger. Always trying new restaurants!',
        interests: ['Fitness', 'Food', 'Travel', 'Photography', 'Dancing'],
        photos: [
          { url: '/api/placeholder?width=400&height=600', isMain: true },
          { url: '/api/placeholder?width=400&height=600', isMain: false },
          { url: '/api/placeholder?width=400&height=600', isMain: false }
        ],
        verification: { isVerified: true },
        compatibilityScore: 88,
        commonInterests: ['Food', 'Photography']
      },
      {
        id: 'profile-5',
        firstName: 'David',
        age: 31,
        location: { city: 'Bronx' },
        bio: 'Entrepreneur and book lover. Building my own startup.',
        interests: ['Business', 'Books', 'Movies', 'Travel', 'Cooking'],
        photos: [
          { url: '/api/placeholder?width=400&height=600', isMain: true },
          { url: '/api/placeholder?width=400&height=600', isMain: false }
        ],
        verification: { isVerified: false },
        compatibilityScore: 76,
        commonInterests: ['Books', 'Travel']
      }
    ];

    return NextResponse.json(
      {
        matches: mockProfiles.slice(offset, offset + limit),
        hasMore: offset + limit < mockProfiles.length,
        totalShown: Math.min(offset + limit, mockProfiles.length)
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
    }
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