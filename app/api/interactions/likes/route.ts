import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import Like from '@/models/Like';
import Match from '@/models/Match';
import { verifyAuth } from '@/lib/auth';

// Like or pass a user
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    const body = await request.json();
    const { targetUserId, action } = body;

    // Validation
    if (!targetUserId || !action) {
      return NextResponse.json(
        { error: 'Target user ID and action are required' },
        { status: 400 }
      );
    }

    if (!['like', 'super_like', 'pass'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be like, super_like, or pass' },
        { status: 400 }
      );
    }

    if (userId === targetUserId) {
      return NextResponse.json(
        { error: 'Cannot perform action on yourself' },
        { status: 400 }
      );
    }

    // Check if target user exists and is active
    const targetUser = await User.findOne({ _id: targetUserId, isActive: true });
    if (!targetUser) {
      return NextResponse.json(
        { error: 'Target user not found or inactive' },
        { status: 404 }
      );
    }

    // Check if user has already performed an action on this target
    const existingLike = await Like.findOne({ liker: userId, liked: targetUserId });
    if (existingLike) {
      return NextResponse.json(
        { error: 'You have already performed an action on this user' },
        { status: 400 }
      );
    }

    // Create like/pass record
    const like = new Like({
      liker: userId,
      liked: targetUserId,
      type: action
    });

    await like.save();

    let isMatch = false;
    let matchId = null;

    // If this is a like or super_like, check for mutual like (match)
    if (action === 'like' || action === 'super_like') {
      const mutualLike = await Like.findOne({
        liker: targetUserId,
        liked: userId,
        type: { $in: ['like', 'super_like'] },
        isActive: true
      });

      if (mutualLike) {
        // Create a match
        const match = new Match({
          user1: userId,
          user2: targetUserId,
          status: 'matched',
          initiatedBy: userId,
          matchedAt: new Date()
        });

        await match.save();

        // Update user stats
        await User.findByIdAndUpdate(userId, { $inc: { 'stats.matches': 1 } });
        await User.findByIdAndUpdate(targetUserId, { $inc: { 'stats.matches': 1 } });

        isMatch = true;
        matchId = match._id;
      }

      // Update target user's like count
      await User.findByIdAndUpdate(targetUserId, { $inc: { 'stats.likes': 1 } });
    }

    // Prepare response
    const response: any = {
      message: `${action === 'pass' ? 'Passed' : 'Liked'} successfully`,
      action,
      isMatch
    };

    if (isMatch) {
      response.matchId = matchId;
      response.matchedUser = {
        id: targetUser._id,
        firstName: targetUser.firstName,
        age: new Date().getFullYear() - targetUser.dateOfBirth.getFullYear(),
        photos: targetUser.photos
      };
    }

    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
    console.error('Like/pass error:', error);

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

// Get user's likes and matches
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'received'; // 'sent', 'received', 'mutual'

    let likes;

    if (type === 'sent') {
      // Likes sent by the user
      likes = await Like.find({ 
        liker: userId, 
        type: { $in: ['like', 'super_like'] },
        isActive: true 
      })
      .populate('liked', 'firstName dateOfBirth photos')
      .sort({ createdAt: -1 });

    } else if (type === 'received') {
      // Likes received by the user
      likes = await Like.find({ 
        liked: userId, 
        type: { $in: ['like', 'super_like'] },
        isActive: true 
      })
      .populate('liker', 'firstName dateOfBirth photos')
      .sort({ createdAt: -1 });

    } else if (type === 'mutual') {
      // Get matches (mutual likes)
      const matches = await Match.find({
        $or: [{ user1: userId }, { user2: userId }],
        status: 'matched',
        isActive: true
      })
      .populate('user1', 'firstName dateOfBirth photos')
      .populate('user2', 'firstName dateOfBirth photos')
      .sort({ matchedAt: -1 });

      const formattedMatches = matches.map(match => {
        const otherUser = match.user1._id.toString() === userId ? match.user2 : match.user1;
        return {
          id: match._id,
          user: {
            id: otherUser._id,
            firstName: otherUser.firstName,
            age: new Date().getFullYear() - otherUser.dateOfBirth.getFullYear(),
            photos: otherUser.photos
          },
          matchedAt: match.matchedAt,
          lastMessageAt: match.lastMessageAt
        };
      });

      return NextResponse.json(
        { matches: formattedMatches },
        { status: 200 }
      );
    }

    // Format likes for response
    const formattedLikes = likes?.map(like => {
      const user = type === 'sent' ? like.liked : like.liker;
      return {
        id: like._id,
        type: like.type,
        user: {
          id: user._id,
          firstName: user.firstName,
          age: new Date().getFullYear() - user.dateOfBirth.getFullYear(),
          photos: user.photos
        },
        createdAt: like.createdAt
      };
    }) || [];

    return NextResponse.json(
      { likes: formattedLikes },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Get likes error:', error);

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