import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // In a real app, you would fetch this data from your database
    // For now, we'll return realistic mock data
    
    const stats = {
      likesToday: Math.floor(Math.random() * 15) + 5, // 5-20 likes
      matches: Math.floor(Math.random() * 8) + 2, // 2-10 matches
      messages: Math.floor(Math.random() * 12) + 3, // 3-15 messages
      profileViews: Math.floor(Math.random() * 25) + 10, // 10-35 views
      superLikesRemaining: Math.floor(Math.random() * 3) + 1, // 1-4 super likes
      likesRemaining: Math.floor(Math.random() * 50) + 25, // 25-75 likes
      totalMatches: Math.floor(Math.random() * 100) + 50, // 50-150 total matches
      responseRate: Math.floor(Math.random() * 40) + 40 // 40-80% response rate
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}