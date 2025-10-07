import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Match from "@/models/Match";
import Message from "@/models/Message";
import User from "@/models/User";
import { verifyAuth } from "@/lib/auth";
import { ObjectId } from "mongodb";
import Block from "../../../models/Block";
import { isObjectId } from "@/lib/validators";
import { logger } from "@/lib/logger";

// Get user's matches
export async function GET(request: NextRequest) {
  try {
    // Connect to database
    try {
      await connectToDatabase();
    } catch (error) {
      logger.error("Database connection error", {
        action: "db_connection_failed",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    // Verify authentication
    const { userId } = verifyAuth(request); // Find all matches for the user
    const matches = await Match.find({
      $or: [{ user1: userId }, { user2: userId }],
      status: "matched",
      isActive: true,
    })
      .populate(
        "user1",
        "_id firstName dateOfBirth photos lastSeen verification privacy"
      )
      .populate(
        "user2",
        "_id firstName dateOfBirth photos lastSeen verification privacy"
      )
      .sort({ lastMessageAt: -1, matchedAt: -1 });

    if (!matches) {
      return NextResponse.json({ matches: [] });
    }

    // Format matches for response
    const formattedMatches = await Promise.all(
      matches.map(async (match) => {
        const otherUser =
          match.user1._id.toString() === userId ? match.user2 : match.user1;

        // Get the last message for this match
        const lastMessage = await Message.findOne({
          match: match._id,
          isDeleted: false,
        }).sort({ createdAt: -1 });

        // Get unread message count
        const unreadCount = await Message.countDocuments({
          match: match._id,
          recipient: userId,
          "readStatus.isRead": false,
          isDeleted: false,
        });

        // Check if the other user is online (active within last 5 minutes)
        const isOnlineRaw =
          otherUser.lastSeen &&
          Date.now() - otherUser.lastSeen.getTime() < 5 * 60 * 1000;

        const ageRaw = otherUser.dateOfBirth
          ? Math.floor(
              (Date.now() - new Date(otherUser.dateOfBirth).getTime()) /
                (1000 * 60 * 60 * 24 * 365.25)
            )
          : null;

        // Respect privacy flags
        const showAge = otherUser.privacy?.showAge !== false;
        const showOnline = otherUser.privacy?.onlineStatus !== false;
        const age = showAge ? ageRaw : null;
        const isOnline = showOnline ? isOnlineRaw : false;

        return {
          _id: match._id,
          user: {
            _id: otherUser._id,
            firstName: otherUser.firstName,
            age,
            photos: otherUser.photos || [],
            lastSeen: otherUser.lastSeen,
            verification: otherUser.verification || { isVerified: false },
            isOnline,
          },
          lastMessage: lastMessage
            ? {
                _id: lastMessage._id,
                content: lastMessage.content,
                type: lastMessage.type,
                sender: lastMessage.sender,
                createdAt: lastMessage.createdAt,
                readStatus: lastMessage.readStatus,
              }
            : null,
          unreadCount,
          matchedAt: match.matchedAt,
          lastMessageAt: match.lastMessageAt,
        };
      })
    );

    return NextResponse.json({ matches: formattedMatches });
  } catch (error: unknown) {
    logger.error("Error getting matches:", {
      action: "get_matches_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    let message = "Failed to get matches";
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message: unknown }).message === "string"
    ) {
      message = (error as { message: string }).message;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Create a new match
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    // Get target user ID from request body
    const { targetUserId } = await request.json();

    if (!targetUserId) {
      return NextResponse.json(
        { error: "Target user ID is required" },
        { status: 400 }
      );
    }
    if (!isObjectId(targetUserId)) {
      return NextResponse.json(
        { error: "Invalid target user id" },
        { status: 400 }
      );
    }
    if (userId === targetUserId) {
      return NextResponse.json(
        { error: "Cannot match with yourself" },
        { status: 400 }
      );
    }

    // Block checks
    const block = await Block.findOne({
      $or: [
        { blocker: userId, blocked: targetUserId, active: true },
        { blocker: targetUserId, blocked: userId, active: true },
      ],
    });
    if (block) {
      return NextResponse.json(
        { error: "Match blocked between users" },
        { status: 403 }
      );
    }

    // Check if users exist
    const [user1, user2] = await Promise.all([
      User.findById(userId),
      User.findById(targetUserId),
    ]);

    if (!user1 || !user2) {
      return NextResponse.json(
        { error: "One or both users not found" },
        { status: 404 }
      );
    }

    // Check if a match already exists between these users
    const existingMatch = await Match.findOne({
      $or: [
        { user1: userId, user2: targetUserId },
        { user1: targetUserId, user2: userId },
      ],
      status: "matched",
      isActive: true,
    });

    if (existingMatch) {
      return NextResponse.json(
        {
          error: "Match already exists",
          matchId: existingMatch._id,
        },
        { status: 400 }
      );
    }

    // Create a new match
    const newMatch = new Match({
      user1: new ObjectId(userId),
      user2: new ObjectId(targetUserId),
      status: "matched",
      initiatedBy: new ObjectId(userId),
      matchedAt: new Date(),
      isActive: true,
    });

    await newMatch.save();

    // Populate user details for response
    await newMatch.populate("user1", "firstName photos lastSeen");
    await newMatch.populate("user2", "firstName photos lastSeen");

    return NextResponse.json({ match: newMatch });
  } catch (error: unknown) {
    logger.error("Error creating match:", {
      action: "create_match_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    let message = "Failed to create match";
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message: unknown }).message === "string"
    ) {
      message = (error as { message: string }).message;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
