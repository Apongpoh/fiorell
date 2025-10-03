import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';
import { computeProfileCompletion } from '@/lib/profileCompletion';
import { sanitizeBio, sanitizeCity, validateInterests } from '@/lib/validators';

// Get user profile
export async function GET(request: NextRequest) {
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

    const completion = computeProfileCompletion(user as any);

    // Return user data with profile completion
    const userResponse = {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      age: user.age,
      gender: user.gender,
      location: user.location,
      bio: user.bio,
      interests: user.interests,
      photos: user.photos,
      preferences: user.preferences,
  lifestyle: user.lifestyle,
      verification: user.verification,
      privacy: user.privacy,
      subscription: user.subscription,
      stats: {
        ...user.stats,
        profileCompleteness: completion.percentage,
        profileScore: completion.score,
        profileBreakdown: completion.breakdown
      },
      isActive: user.isActive,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt
    };

    return NextResponse.json(
      { user: userResponse },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Get profile error:', error);

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

// Update user profile
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    const body = await request.json();
    const {
      firstName,
      lastName,
  age,
      gender,
      dateOfBirth,
      bio,
      location,
      interests,
      preferences,
      privacy,
      lifestyle
    } = body;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update fields if provided
    if (firstName !== undefined) user.firstName = firstName.trim();
    if (lastName !== undefined) user.lastName = lastName.trim();
  // Age is computed from dateOfBirth; ignore direct age assignment
    if (gender !== undefined) user.gender = gender;
  if (dateOfBirth !== undefined && dateOfBirth !== '') user.dateOfBirth = new Date(dateOfBirth);
  if (bio !== undefined) user.bio = sanitizeBio(String(bio));
    if (location !== undefined) {
      if (!user.location) {
        user.location = { city: '', country: '', coordinates: { type: 'Point', coordinates: [0,0] } } as any;
      }
      if (location.city !== undefined) user.location.city = sanitizeCity(String(location.city || ''));
      if (location.country !== undefined) user.location.country = String(location.country).slice(0,56);
    }
    if (interests !== undefined) {
      user.interests = validateInterests(interests);
    }
    if (preferences !== undefined) {
      if (preferences.ageRange) {
        user.preferences.ageRange = preferences.ageRange;
      }
      if (preferences.maxDistance !== undefined) {
        user.preferences.maxDistance = preferences.maxDistance;
      }
      if (preferences.lookingFor !== undefined) {
        user.preferences.lookingFor = preferences.lookingFor;
      }
      if (preferences.dealBreakers) {
        user.preferences.dealBreakers = {
          ...(user.preferences.dealBreakers || {}),
          ...preferences.dealBreakers,
        } as any;
      }
    }
    if (lifestyle !== undefined) {
      // Merge lifestyle while allowing clearing (null/empty string removes field)
      const current = (user.lifestyle || {}) as any;
      const next: any = { ...current };
      for (const key of Object.keys(lifestyle)) {
        const val = (lifestyle as any)[key];
        if (val === null || val === '' || typeof val === 'undefined') {
          delete next[key];
        } else {
          next[key] = val;
        }
      }
      user.lifestyle = next;
    }
    if (privacy !== undefined) {
      user.privacy = { ...user.privacy, ...privacy };
    }

    await user.save();

    const completion = computeProfileCompletion(user as any);

    // Return updated user data with profile completion
    const userResponse = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      age: user.age,
      gender: user.gender,
      location: user.location,
      bio: user.bio,
      interests: user.interests,
      photos: user.photos,
      preferences: user.preferences,
  lifestyle: user.lifestyle,
      verification: user.verification,
      privacy: user.privacy,
      subscription: user.subscription,
      stats: {
        ...user.stats,
        profileCompleteness: completion.percentage,
        profileScore: completion.score,
        profileBreakdown: completion.breakdown
      },
      isActive: user.isActive,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt
    };

    return NextResponse.json(
      {
        message: 'Profile updated successfully',
        user: userResponse
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Update profile error:', error);

    if (error.message === 'Authentication token is required' || error.message === 'Invalid or expired token') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete user account
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    // Find and delete user (hard delete)
    const result = await User.findByIdAndDelete(userId);
    if (!result) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Account deleted successfully' },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Delete profile error:', error);

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