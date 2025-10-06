import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Interaction from "@/models/Interaction";
import Match from "@/models/Match";
import { verifyAuth } from "@/lib/auth";
import Block from "../../../../models/Block";
import { isObjectId } from "@/lib/validators";

// Like or pass a user
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    const body = await request.json();
    const { targetUserId, action } = body;

    // Validation
    if (!targetUserId || !action) {
      return NextResponse.json(
        { error: "Target user ID and action are required" },
        { status: 400 }
      );
    }

    if (!isObjectId(targetUserId)) {
      return NextResponse.json(
        { error: "Invalid target user id" },
        { status: 400 }
      );
    }

    if (!["like", "super_like", "pass"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be like, super_like, or pass" },
        { status: 400 }
      );
    }

    if (userId === targetUserId) {
      return NextResponse.json(
        { error: "Cannot perform action on yourself" },
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
        { error: "Action blocked between users" },
        { status: 403 }
      );
    }

    // Check if target user exists and is active
    const targetUser = await User.findOne({
      _id: targetUserId,
      isActive: true,
    });
    if (!targetUser) {
      return NextResponse.json(
        { error: "Target user not found or inactive" },
        { status: 404 }
      );
    }

    // Check if user has already performed this action today
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const existingTodayLike = await Interaction.findOne({
      userId: userId,
      targetUserId: targetUserId,
      action: action,
      createdAt: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });
    
    if (existingTodayLike) {
      return NextResponse.json(
        { error: `You can only ${action.replace('_', ' ')} this user once per day. Try again tomorrow!` },
        { status: 400 }
      );
    }

    // Create like/pass record
    const interaction = new Interaction({
      userId: userId,
      targetUserId: targetUserId,
      action: action,
      isMatch: false,
    });

    await interaction.save();

    let isMatch = false;
    let matchId = null;

    // If this is a like or super_like, check for mutual like (match)
    if (action === "like" || action === "super_like") {
      const mutualInteraction = await Interaction.findOne({
        userId: targetUserId,
        targetUserId: userId,
        action: { $in: ["like", "super_like"] },
      });

      if (mutualInteraction) {
        // Mark both interactions as matches
        await Interaction.updateMany(
          {
            $or: [
              { userId: userId, targetUserId: targetUserId },
              { userId: targetUserId, targetUserId: userId },
            ],
          },
          { isMatch: true }
        );

        // Create a match
        const match = new Match({
          user1: userId,
          user2: targetUserId,
          status: "matched",
          initiatedBy: userId,
          matchedAt: new Date(),
        });

        await match.save();

        // Update user stats
        await User.findByIdAndUpdate(userId, {
          $inc: { "stats.totalMatches": 1 },
        });
        await User.findByIdAndUpdate(targetUserId, {
          $inc: { "stats.totalMatches": 1 },
        });

        isMatch = true;
        matchId = match._id;
      }

      // Update target user's like count
      await User.findByIdAndUpdate(targetUserId, {
        $inc: { "stats.totalLikesReceived": 1 },
      });
    }

    // Prepare response
    interface LikeResponse {
      message: string;
      action: string;
      isMatch: boolean;
      matchId?: string;
      matchedUser?: {
        id: string;
        firstName: string;
        age: number;
        photos: unknown;
      };
    }
    const response: LikeResponse = {
      message: `${action === "pass" ? "Passed" : "Liked"} successfully`,
      action,
      isMatch,
    };

    if (isMatch) {
      response.matchId = matchId;
      response.matchedUser = {
        id: targetUser._id,
        firstName: targetUser.firstName,
        age: new Date().getFullYear() - targetUser.dateOfBirth.getFullYear(),
        photos: targetUser.photos,
      };
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error: unknown) {
    console.error("Like/pass error:", error);

    if (
      (typeof error === "object" &&
        error !== null &&
        "message" in error &&
        (error as { message: string }).message ===
          "Authentication token is required") ||
      (error as { message: string }).message === "Invalid or expired token"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get user's likes and matches
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "received"; // 'sent', 'received', 'mutual'

    let likes;

    if (type === "sent") {
      // Likes sent by the user
      likes = await Interaction.find({
        userId: userId,
        action: { $in: ["like", "super_like"] },
      })
        .populate("targetUserId", "firstName dateOfBirth photos")
        .sort({ createdAt: -1 });
    } else if (type === "received") {
      // Likes received by the user
      likes = await Interaction.find({
        targetUserId: userId,
        action: { $in: ["like", "super_like"] },
      })
        .populate("userId", "firstName dateOfBirth photos")
        .sort({ createdAt: -1 });
    } else if (type === "mutual") {
      // Get matches (mutual likes)
      const matches = await Match.find({
        $or: [{ user1: userId }, { user2: userId }],
        status: "matched",
        isActive: true,
      })
        .populate("user1", "firstName dateOfBirth photos")
        .populate("user2", "firstName dateOfBirth photos")
        .sort({ matchedAt: -1 });

      const formattedMatches = matches.map((match) => {
        const otherUser =
          match.user1._id.toString() === userId ? match.user2 : match.user1;
        return {
          id: match._id,
          user: {
            id: otherUser._id,
            firstName: otherUser.firstName,
            age: new Date().getFullYear() - otherUser.dateOfBirth.getFullYear(),
            photos: otherUser.photos,
          },
          matchedAt: match.matchedAt,
          lastMessageAt: match.lastMessageAt,
        };
      });

      return NextResponse.json({ matches: formattedMatches }, { status: 200 });
    }

    // Format likes for response
    const formattedLikes =
      likes?.map((interaction: { _id: unknown; action: string; targetUserId: { _id: unknown; firstName: string; dateOfBirth: Date; photos: unknown }; userId: { _id: unknown; firstName: string; dateOfBirth: Date; photos: unknown }; createdAt: Date }) => {
        const user = type === "sent" ? interaction.targetUserId : interaction.userId;
        return {
          id: interaction._id,
          type: interaction.action,
          user: {
            id: user._id,
            firstName: user.firstName,
            age: new Date().getFullYear() - user.dateOfBirth.getFullYear(),
            photos: user.photos,
          },
          createdAt: interaction.createdAt,
        };
      }) || [];

    return NextResponse.json({ likes: formattedLikes }, { status: 200 });
  } catch (error: unknown) {
    console.error("Get likes error:", error);

    if (
      (typeof error === "object" &&
        error !== null &&
        "message" in error &&
        (error as { message: string }).message ===
          "Authentication token is required") ||
      (error as { message: string }).message === "Invalid or expired token"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
