// app/api/interactions/pre-match-message/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyAuth } from "@/lib/auth";
import { canUserPerformAction } from "@/lib/subscription";
import User from "@/models/User";
import Interaction from "@/models/Interaction";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);
    const { targetUserId, message } = await request.json();

    if (!targetUserId || !message) {
      return NextResponse.json(
        { error: "Target user ID and message are required" },
        { status: 400 }
      );
    }

    if (message.length < 10) {
      return NextResponse.json(
        { error: "Message must be at least 10 characters long" },
        { status: 400 }
      );
    }

    if (message.length > 500) {
      return NextResponse.json(
        { error: "Message must be less than 500 characters" },
        { status: 400 }
      );
    }

    // Check if user can message before match (Premium Plus feature)
    const canMessage = await canUserPerformAction(userId, "message_before_matching");
    if (!canMessage.allowed) {
      return NextResponse.json(
        { error: canMessage.reason || "Premium subscription required for message before match" },
        { status: 403 }
      );
    }

    // Check if target user exists
    const targetUser = await User.findById(targetUserId).select("firstName");
    if (!targetUser) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 }
      );
    }

    // Check if users have already interacted
    const existingInteraction = await Interaction.findOne({
      $or: [
        { userId, targetUserId },
        { userId: targetUserId, targetUserId: userId }
      ]
    });

    if (existingInteraction) {
      return NextResponse.json(
        { error: "You have already interacted with this user" },
        { status: 400 }
      );
    }

    // Create the pre-match message interaction
    const interaction = new Interaction({
      userId,
      targetUserId,
      action: "pre_match_message",
      message,
      timestamp: new Date(),
      isRead: false,
      metadata: {
        type: "premium_feature",
        feature: "message_before_match"
      }
    });

    await interaction.save();

    // Also record as a regular like so the match system can work
    const likeInteraction = new Interaction({
      userId,
      targetUserId,
      action: "like",
      timestamp: new Date(),
      metadata: {
        hasPreMatchMessage: true,
        preMatchMessageId: interaction._id
      }
    });

    await likeInteraction.save();

    return NextResponse.json({
      success: true,
      message: "Pre-match message sent successfully",
      interactionId: interaction._id
    });

  } catch (error) {
    console.error("Pre-match message error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}