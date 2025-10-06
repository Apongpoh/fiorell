import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Match from "@/models/Match";
import Message from "@/models/Message";
import { verifyAuth } from "@/lib/auth";
import User from "@/models/User";
import { getUserSubscription } from "@/lib/subscription";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    const body = await request.json();
    const { matchId } = body;

    if (!matchId) {
      return NextResponse.json(
        { error: "Match ID is required" },
        { status: 400 }
      );
    }

    // Verify user is part of this match
    const match = await Match.findOne({
      _id: matchId,
      $or: [{ user1: userId }, { user2: userId }],
      status: "matched",
      isActive: true,
    });

    if (!match) {
      return NextResponse.json(
        { error: "Match not found or unauthorized" },
        { status: 404 }
      );
    }

    // Check if user has premium for read receipts
    const subscription = await getUserSubscription(userId);
    if (!subscription.hasPremium) {
      return NextResponse.json(
        { 
          error: "Read receipts are a Premium feature. Upgrade to see when your messages are read!",
          code: "PREMIUM_FEATURE_REQUIRED",
          upgradeRequired: true,
          feature: "read_receipts"
        },
        { status: 403 }
      );
    }

    // Respect privacy: if user's readReceipts is disabled, do not mark as read
    const viewer = (await User.findById(userId)
      .select("privacy.readReceipts")
      .lean()) as { privacy?: { readReceipts?: boolean } } | null;
    const allowReadReceipts = viewer?.privacy?.readReceipts !== false;

    if (!allowReadReceipts) {
      return NextResponse.json(
        { message: "Read receipts disabled", count: 0 },
        { status: 200 }
      );
    }

    // Mark unread messages as read
    const result = await Message.updateMany(
      {
        match: matchId,
        recipient: userId,
        "readStatus.isRead": false,
        isDeleted: false,
      },
      {
        $set: {
          "readStatus.isRead": true,
          "readStatus.readAt": new Date(),
        },
      }
    );

    return NextResponse.json(
      { message: "Messages marked as read", count: result.modifiedCount },
      { status: 200 }
    );
  } catch (error: unknown) {
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
