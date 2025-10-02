import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Match from '@/models/Match';
import Message from '@/models/Message';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';

// Get messages for a specific match
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!matchId) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      );
    }

    // Verify user is part of this match
    // Check if matchId is valid MongoDB ObjectId
    if (!matchId.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json(
        { error: 'Invalid match ID format' },
        { status: 400 }
      );
    }

    // Fetch and validate match
    const match = await Match.findOne({
      _id: matchId,
      $or: [{ user1: userId }, { user2: userId }],
      status: 'matched',
      isActive: true
    }).populate('user1 user2', '_id firstName photos lastSeen');
    
    if (!match?.user1 || !match?.user2) {
      return NextResponse.json(
        { error: 'Match data is incomplete' },
        { status: 500 }
      );
    }

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found or you are not authorized to view these messages' },
        { status: 404 }
      );
    }

    // Get messages for this match
    const messages = await Message.find({
      match: matchId,
      isDeleted: false
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(offset)
    .populate('sender', 'firstName') || [];

    // Mark messages as read if they were sent to the current user
    await Message.updateMany(
      {
        match: matchId,
        recipient: userId,
        'readStatus.isRead': false,
        isDeleted: false
      },
      {
        'readStatus.isRead': true,
        'readStatus.readAt': new Date()
      }
    );

    // Format messages for response
    const formattedMessages = messages.reverse().map(message => ({
      id: message._id,
      content: message.content,
      type: message.type,
      media: message.media,
      sender: {
        id: message.sender._id,
        firstName: message.sender.firstName,
        isCurrentUser: message.sender._id.toString() === userId
      },
      readStatus: message.readStatus,
      createdAt: message.createdAt
    }));

    // Format match data for response
    let formattedMatch;
    try {
      formattedMatch = {
        _id: match._id,
        user1: {
          _id: match.user1._id,
          firstName: match.user1.firstName,
          photos: match.user1.photos || [],
          lastSeen: match.user1.lastSeen
        },
        user2: {
          _id: match.user2._id,
          firstName: match.user2.firstName,
          photos: match.user2.photos || [],
          lastSeen: match.user2.lastSeen
        },
        status: match.status,
        matchedAt: match.matchedAt,
        lastMessageAt: match.lastMessageAt
      };
    } catch (error) {
      console.error('Error formatting match data:', error);
      return NextResponse.json(
        { error: 'Failed to process match data' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        messages: formattedMessages,
        match: formattedMatch,
        hasMore: messages.length === limit
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Get messages error:', error);

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

// Send a message
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    const body = await request.json();
    const { matchId, content, type = 'text' } = body;

    // Validation
    if (!matchId) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      );
    }

    if (type === 'text' && (!content || content.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    if (content && content.length > 1000) {
      return NextResponse.json(
        { error: 'Message cannot exceed 1000 characters' },
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
        { error: 'Match not found or you are not authorized to send messages' },
        { status: 404 }
      );
    }

    // Determine recipient
    const recipientId = match.user1._id.toString() === userId ? 
      match.user2._id : match.user1._id;

    // Create message
    const message = new Message({
      match: matchId,
      sender: userId,
      recipient: recipientId,
      content: content?.trim(),
      type
    });

    await message.save();

    // Update match's last message timestamp
    match.lastMessageAt = new Date();
    await match.save();

    // Populate sender info for response
    await message.populate('sender', 'firstName');

    // Format response
    const formattedMessage = {
      id: message._id,
      content: message.content,
      type: message.type,
      media: message.media,
      sender: {
        id: message.sender._id,
        firstName: message.sender.firstName,
        isCurrentUser: true
      },
      readStatus: message.readStatus,
      createdAt: message.createdAt
    };

    return NextResponse.json(
      {
        message: 'Message sent successfully',
        data: formattedMessage
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Send message error:', error);

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

// Delete a message
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    // Find message and verify ownership
    const message = await Message.findOne({
      _id: messageId,
      sender: userId,
      isDeleted: false
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found or you are not authorized to delete it' },
        { status: 404 }
      );
    }

    // Soft delete the message
    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    return NextResponse.json(
      { message: 'Message deleted successfully' },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Delete message error:', error);

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