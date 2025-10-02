import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');
    const token = searchParams.get('token');

    // Verify token manually since it's in query params for SSE
    if (!token) {
      throw new Error('Authentication token is required');
    }

    const { userId } = verifyToken(token);

    if (!matchId) {
      return NextResponse.json(
        { error: 'Match ID is required' },
        { status: 400 }
      );
    }

    // Set up server-sent events
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        controller.enqueue(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

        // Handle new messages
        // You would implement your message queue or pub/sub system here
        // For example, using Redis pub/sub or a similar solution

        // Example cleanup
        return () => {
          // Clean up subscriptions
        };
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error: any) {
    console.error('SSE error:', error);

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