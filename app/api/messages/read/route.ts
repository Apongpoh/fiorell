import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Match from '@/models/Match';
import Message from '@/models/Message';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);
    
    const body = await request.json();
    const { matchId } = body;

    if (!matchId) {
      return NextResponse.json(
        { error: 'Match ID is required' },
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

    // Mark unread messages as read
    const result = await Message.updateMany(
      {
        match: matchId,
        recipient: userId,
        'readStatus.isRead': false,
        isDeleted: false
      },
      {
        $set: {
          'readStatus.isRead': true,
          'readStatus.readAt': new Date()
        }
      }
    );

    return NextResponse.json(
      { message: 'Messages marked as read', count: result.modifiedCount },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Mark messages as read error:', error);

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