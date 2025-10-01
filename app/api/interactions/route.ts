import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.userId || !body.targetUserId || !body.action) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, targetUserId, action' },
        { status: 400 }
      );
    }

    // Validate action type
    if (!['like', 'pass', 'super_like'].includes(body.action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be like, pass, or super_like' },
        { status: 400 }
      );
    }

    // Store the interaction (in a real app, this would go to a database)
    const interaction = {
      userId: body.userId,
      targetUserId: body.targetUserId,
      action: body.action,
      timestamp: new Date().toISOString()
    };

    // Check if it's a match (both users liked each other)
    // In a real app, you would query the database for mutual likes
    const isMatch = body.action === 'like' && Math.random() > 0.7; // 30% chance of match for demo

    return NextResponse.json({ 
      success: true, 
      match: isMatch ? {
        id: `match-${Date.now()}`,
        userId: body.userId,
        matchedUserId: body.targetUserId,
        timestamp: new Date().toISOString()
      } : null
    });

  } catch (error) {
    console.error('Error processing interaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}