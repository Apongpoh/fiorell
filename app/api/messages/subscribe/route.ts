import { NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";
import { addListener, removeListener } from "@/lib/pubsub";
import { verifyToken } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import Match from "@/models/Match";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get("matchId");
    const token = searchParams.get("token");

    // Verify token manually since it's in query params for SSE
    if (!token) {
      throw new Error("Authentication token is required");
    }

    if (!matchId) {
      return NextResponse.json(
        { error: "Match ID is required" },
        { status: 400 }
      );
    }

    if (!matchId.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json(
        { error: "Invalid match ID format" },
        { status: 400 }
      );
    }

    const { userId } = verifyToken(token);

    await connectToDatabase();

    const match = await Match.findOne({
      _id: matchId,
      $or: [{ user1: userId }, { user2: userId }],
      status: "matched",
      isActive: true,
    }).select("_id");

    if (!match) {
      return NextResponse.json(
        { error: "Match not found or unauthorized" },
        { status: 404 }
      );
    }

    // Set up server-sent events
    const stream = new ReadableStream(
      {
        start(controller) {
          // Send initial connection message
          controller.enqueue(
            `data: ${JSON.stringify({ type: "connected" })}\n\n`
          );

          const listener = (msg: unknown) => {
            controller.enqueue(`data: ${JSON.stringify(msg)}\n\n`);
          };

          addListener(matchId!, listener);

          // Cleanup on disconnect
          return () => {
            removeListener(matchId!, listener);
          };
        },
      },
      { highWaterMark: 1 } // Ensure low-latency delivery
    );

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: unknown) {
    logger.error("SSE error:", {
      action: "sse_error",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });

    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      ((error as { message: string }).message ===
        "Authentication token is required" ||
        (error as { message: string }).message === "Invalid or expired token")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
