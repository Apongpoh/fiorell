import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Match from '@/models/Match';
import Message from '@/models/Message';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';

// Get user's matches
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    // Find all matches for the user
    const matches = await Match.find({
      $or: [{ user1: userId }, { user2: userId }],
      status: 'matched',
      isActive: true
    })
    .populate('user1', 'firstName dateOfBirth photos lastSeen verification')
    .populate('user2', 'firstName dateOfBirth photos lastSeen verification')
    .sort({ lastMessageAt: -1, matchedAt: -1 });

    // Format matches for response
    const formattedMatches = await Promise.all(matches.map(async (match) => {
      const otherUser = match.user1._id.toString() === userId ? match.user2 : match.user1;
      
      // Get the last message for this match
      const lastMessage = await Message.findOne({
        match: match._id,
        isDeleted: false
      }).sort({ createdAt: -1 });

      // Get unread message count
      const unreadCount = await Message.countDocuments({
        match: match._id,
        recipient: userId,
        'readStatus.isRead': false,
        isDeleted: false
      });

      // Check if the other user is online (active within last 5 minutes)
      const isOnline = otherUser.lastSeen && 
        (Date.now() - otherUser.lastSeen.getTime()) < (5 * 60 * 1000);

      return {
        id: match._id,
        user: {
          id: otherUser._id,
          firstName: otherUser.firstName,
          age: new Date().getFullYear() - otherUser.dateOfBirth.getFullYear(),
          photos: otherUser.photos,
          isOnline,
          lastSeen: otherUser.lastSeen,
          isVerified: otherUser.verification.isVerified
        },
        lastMessage: lastMessage ? {
          id: lastMessage._id,
          content: lastMessage.content,
          type: lastMessage.type,
          sender: lastMessage.sender.toString(),
          createdAt: lastMessage.createdAt,
          isRead: lastMessage.readStatus.isRead
        } : null,
        unreadCount,
        matchedAt: match.matchedAt,
        lastMessageAt: match.lastMessageAt || match.matchedAt
      };
    }));

    return NextResponse.json(
      { matches: formattedMatches },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Get matches error:', error);

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

// Unmatch with a user
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');

    if (!matchId) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      );
    }

    // Find the match
    const match = await Match.findOne({
      _id: matchId,
      $or: [{ user1: userId }, { user2: userId }],
      status: 'matched'
    });

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    // Update match status to unmatched
    match.status = 'unmatched';
    match.isActive = false;
    await match.save();

    // Optionally, you could also deactivate the messages
    await Message.updateMany(
      { match: matchId },
      { isDeleted: true, deletedAt: new Date() }
    );

    return NextResponse.json(
      { message: 'Successfully unmatched' },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Unmatch error:', error);

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