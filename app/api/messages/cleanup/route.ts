import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Message from "@/models/Message";
import { verifyAuth } from "@/lib/auth";

// Cleanup expired disappearing messages
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication (admin operation)
    verifyAuth(request);

    // Delete all expired disappearing messages
    const result = await Message.deleteMany({
      disappearsAt: {
        $lte: new Date(),
        $ne: null,
      },
    });

    return NextResponse.json(
      {
        message: "Cleanup completed",
        deletedCount: result.deletedCount,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Cleanup expired messages error:", error);

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
