import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyAuth } from "@/lib/auth";
import User from "@/models/User";
import Message from "@/models/Message";
import { canUserPerformAction } from "@/lib/subscription";
import mongoose from "mongoose";
import { logger } from "@/lib/logger";

// Send a pre-match message

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    const body = await request.json();
    const { recipientId, content } = body;

    // Validation
    if (!recipientId || !content) {
      return NextResponse.json(
        { error: "Recipient ID and message content are required" },
        { status: 400 }
      );
    }

    if (content.trim().length === 0) {
      return NextResponse.json(
        { error: "Message content cannot be empty" },
        { status: 400 }
      );
    }

    if (content.length > 500) {
      return NextResponse.json(
        {
          error: "Message too long. Maximum 500 characters for first messages.",
        },
        { status: 400 }
      );
    }

    if (userId === recipientId) {
      return NextResponse.json(
        { error: "Cannot send message to yourself" },
        { status: 400 }
      );
    }

    // Check if user can message before matching (Premium Plus feature)
    const messageCheck = await canUserPerformAction(
      userId,
      "message_before_match"
    );
    if (!messageCheck.allowed) {
      return NextResponse.json(
        {
          error: messageCheck.reason,
          code: "PREMIUM_FEATURE_REQUIRED",
          upgradeRequired: true,
          feature: "message_before_match",
        },
        { status: 403 }
      );
    }

    // Check if recipient exists and is active
    const recipient = await User.findOne({
      _id: recipientId,
      isActive: true,
    }).select("_id firstName privacy");

    if (!recipient) {
      return NextResponse.json(
        { error: "Recipient not found or inactive" },
        { status: 404 }
      );
    }

    // Check if users are already matched or have existing messages
    const existingMessages = await Message.findOne({
      $or: [
        { sender: userId, recipient: recipientId },
        { sender: recipientId, recipient: userId },
      ],
    });

    if (existingMessages) {
      return NextResponse.json(
        { error: "You already have a conversation with this user" },
        { status: 409 }
      );
    }

    // Check recipient's privacy settings for unsolicited messages
    if (recipient.privacy?.blockUnmatchedMessages) {
      return NextResponse.json(
        { error: "This user has disabled messages from unmatched profiles" },
        { status: 403 }
      );
    }

    // Create a special "pre-match" message
    const message = new Message({
      sender: userId,
      recipient: recipientId,
      content: content.trim(),
      type: "text",
      readStatus: {
        isRead: false,
      },
      isDeleted: false,
      hiddenFrom: [],
      // Special flag for pre-match messages
      isPreMatch: true,
      match: new mongoose.Types.ObjectId(), // Temporary match ID for pre-match messages
    });

    await message.save();

    // Get sender info for response
    const sender = await User.findById(userId).select("firstName photos");

    return NextResponse.json(
      {
        message: "Pre-match message sent successfully!",
        messageId: message._id,
        preview: {
          senderName: sender?.firstName,
          content: content.trim(),
          sentAt: message.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Pre-match message error:", {
      action: "send_pre_match_message_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });

    if (
      error instanceof Error &&
      (error.message === "Authentication token is required" ||
        error.message === "Invalid or expired token")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get pre-match messages received by user
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    // Find pre-match messages received
    const preMatchMessages = await Message.find({
      recipient: userId,
      isPreMatch: true,
      isDeleted: false,
    })
      .populate("sender", "firstName photos")
      .sort({ createdAt: -1 })
      .limit(20);

    const formattedMessages = preMatchMessages.map((msg) => ({
      id: msg._id,
      content: msg.content,
      sender: {
        id: msg.sender._id,
        firstName: msg.sender.firstName,
        photo: msg.sender.photos?.[0]?.url,
      },
      sentAt: msg.createdAt,
      isRead: msg.readStatus.isRead,
    }));

    return NextResponse.json(
      {
        messages: formattedMessages,
        count: formattedMessages.length,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Get pre-match messages error:", {
      action: "get_pre_match_messages_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });

    if (
      error instanceof Error &&
      (error.message === "Authentication token is required" ||
        error.message === "Invalid or expired token")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
