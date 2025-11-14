import { NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";
import { addListener, removeListener } from "@/lib/pubsub";

// --- In-memory pub/sub ---
// type MessageListener = (msg: ChatMessage) => void;
// const matchListeners: Record<string, Set<MessageListener>> = {};

// Call this from your message POST handler after saving a new message
// export function publishMessage(matchId: string, message: ChatMessage) {
//   const listeners = matchListeners[matchId];
//   if (listeners) {
//     for (const listener of listeners) {
//       try {
//         listener(message);
//       } catch {}
//     }
//   }
// }

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
