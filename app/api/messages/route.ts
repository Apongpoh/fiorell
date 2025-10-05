import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Match from "@/models/Match";
import Message from "@/models/Message";
import { verifyAuth } from "@/lib/auth";
import Block from "@/models/Block";

// Simple in-memory throttle & duplicate cache (best-effort, per process)
const recentMessageHashes: Map<string, { contentHash: string; ts: number }> =
  new Map();
const RATE_WINDOW_MS = 3500; // minimum gap between messages from same user in same match (soft throttle)

// Very small profanity placeholder list (extend or replace with dedicated service)
const BANNED_WORDS = [
  // Hate speech/racism
  "nigger",
  "faggot",
  "chink",
  "spic",
  "kike",
  "coon",
  "gook",
  "wetback",
  "slut",
  "whore",
  "tranny",
  "retard",
  "dyke",
  "twink",
  "paki",
  "terrorist",
  "isis",
  // Sexual harassment/explicit
  "rape",
  "cum",
  "dick",
  "pussy",
  "cock",
  "anal",
  "blowjob",
  "handjob",
  "nude",
  "nudes",
  "sex",
  "porn",
  "xxx",
  "horny",
  "milf",
  "incest",
  "pedophile",
  "child porn",
  // Violence/threats
  "kill",
  "murder",
  "die",
  "suicide",
  "hang",
  "shoot",
  "stab",
  "bomb",
  "attack",
  "abuse",
  "beat",
  "assault",
  // General offensive
  "bitch",
  "asshole",
  "motherfucker",
  "cunt",
  "twat",
  "douche",
  "bastard",
  "jerk",
  "idiot",
  "moron",
  "loser",
];
const hasBannedWord = (text: string) => {
  const lower = text.toLowerCase();
  return BANNED_WORDS.some((w) => lower.includes(w));
};

// Get messages for a specific match
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get("matchId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!matchId) {
      return NextResponse.json(
        { error: "Match ID is required" },
        { status: 400 }
      );
    }

    // Verify user is part of this match
    // Check if matchId is valid MongoDB ObjectId
    if (!matchId.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json(
        { error: "Invalid match ID format" },
        { status: 400 }
      );
    }

    // Fetch and validate match
    const match = await Match.findOne({
      _id: matchId,
      $or: [{ user1: userId }, { user2: userId }],
      status: "matched",
      isActive: true,
    }).populate("user1 user2", "_id firstName photos lastSeen");
    // Block checks: if either party has blocked the other, prevent message access
    const otherUserId =
      match.user1._id.toString() === userId
        ? match.user2._id.toString()
        : match.user1._id.toString();
    const blockedRel = await Block.findOne({
      active: true,
      $or: [
        { blocker: userId, blocked: otherUserId },
        { blocker: otherUserId, blocked: userId },
      ],
    });
    if (blockedRel) {
      return NextResponse.json(
        { error: "Messaging is disabled due to a block between users" },
        { status: 403 }
      );
    }

    if (!match?.user1 || !match?.user2) {
      return NextResponse.json(
        { error: "Match data is incomplete" },
        { status: 500 }
      );
    }

    if (!match) {
      return NextResponse.json(
        {
          error:
            "Match not found or you are not authorized to view these messages",
        },
        { status: 404 }
      );
    }

    // Get messages for this match, excluding deleted, hidden, and expired disappearing messages
    const messages =
      (await Message.find({
        match: matchId,
        isDeleted: false,
        hiddenFrom: { $ne: userId },
        $or: [
          { disappearsAt: { $exists: false } }, // Regular messages
          { disappearsAt: null }, // Regular messages with null value
          { disappearsAt: { $gt: new Date() } }, // Non-expired disappearing messages
        ],
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .populate("sender", "firstName")) || [];

    // Mark messages as read if they were sent to the current user
    await Message.updateMany(
      {
        match: matchId,
        recipient: userId,
        "readStatus.isRead": false,
        isDeleted: false,
      },
      {
        "readStatus.isRead": true,
        "readStatus.readAt": new Date(),
      }
    );

    // Format messages for response
    const formattedMessages = messages.reverse().map((message) => ({
      id: message._id,
      content: message.content,
      type: message.type,
      media: message.media,
      sender: {
        id: message.sender._id,
        firstName: message.sender.firstName,
        isCurrentUser: message.sender._id.toString() === userId,
      },
      readStatus: message.readStatus,
      createdAt: message.createdAt,
      disappearingDuration: message.disappearingDuration,
      disappearsAt: message.disappearsAt,
    }));

    // Format match data for response
    let formattedMatch;
    try {
      formattedMatch = {
        _id: match._id,
        user1: {
          _id: match.user1._id,
          firstName: match.user1.firstName,
          photos: match.user1.photos || [],
          lastSeen: match.user1.lastSeen,
        },
        user2: {
          _id: match.user2._id,
          firstName: match.user2.firstName,
          photos: match.user2.photos || [],
          lastSeen: match.user2.lastSeen,
        },
        status: match.status,
        matchedAt: match.matchedAt,
        lastMessageAt: match.lastMessageAt,
        disappearingMessageDuration: match.disappearingMessageDuration ?? null,
      };
    } catch {
      return NextResponse.json(
        { error: "Failed to process match data" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        messages: formattedMessages,
        match: formattedMatch,
        hasMore: messages.length === limit,
      },
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

// Send a message
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    const body = await request.json();
    const {
      matchId,
      content: rawContent,
      type = "text",
      disappearingDuration,
      disappearsAt,
      // Encryption fields
      isEncrypted = false,
      encryptedContent,
      iv,
      keyId,
    } = body;
    let content = rawContent;

    // Basic normalization
    if (typeof content === "string") {
      // Collapse internal excessive whitespace & trim
      content = content.replace(/\s+/g, " ").trim();
    }

    // Validation
    if (!matchId) {
      return NextResponse.json(
        { error: "Match ID is required" },
        { status: 400 }
      );
    }

    if (type === "text" && !isEncrypted && (!content || content.length === 0)) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    if (type === "text" && isEncrypted && (!encryptedContent || !iv)) {
      return NextResponse.json(
        { error: "Encrypted message requires encryptedContent and iv" },
        { status: 400 }
      );
    }

    if (content && content.length > 1000) {
      return NextResponse.json(
        { error: "Message cannot exceed 1000 characters" },
        { status: 400 }
      );
    }

    // Skip content validation for encrypted messages
    if (type === "text" && content && !isEncrypted) {
      // Reject messages that are only punctuation/emojis repeated (low-signal spam heuristic)
      const noAlphaNum = content.replace(/[^a-z0-9]+/gi, "");
      if (noAlphaNum.length === 0 && content.length > 10) {
        return NextResponse.json(
          { error: "Message appears to contain no meaningful content" },
          { status: 400 }
        );
      }
      if (hasBannedWord(content)) {
        return NextResponse.json(
          { error: "Message contains prohibited language" },
          { status: 400 }
        );
      }
    }

    // Verify user is part of this match
    const match = await Match.findOne({
      _id: matchId,
      $or: [{ user1: userId }, { user2: userId }],
      status: "matched",
      isActive: true,
    });
    // Block checks before sending messages
    const otherUserId =
      match.user1.toString() === userId
        ? match.user2.toString()
        : match.user1.toString();
    const blockedRel = await Block.findOne({
      active: true,
      $or: [
        { blocker: userId, blocked: otherUserId },
        { blocker: otherUserId, blocked: userId },
      ],
    });
    if (blockedRel) {
      return NextResponse.json(
        { error: "Messaging is disabled due to a block between users" },
        { status: 403 }
      );
    }

    if (!match) {
      return NextResponse.json(
        { error: "Match not found or you are not authorized to send messages" },
        { status: 404 }
      );
    }

    // Rate limiting / duplicate suppression
    const key = `${userId}:${matchId}`;
    const now = Date.now();
    const last = recentMessageHashes.get(key);
    const contentHash =
      type === "text" && content
        ? `${content.length}:${content.slice(0, 32)}`
        : `${type}:${now}`;
    if (last) {
      if (now - last.ts < RATE_WINDOW_MS) {
        return NextResponse.json(
          {
            error:
              "You are sending messages too quickly. Please wait a moment.",
          },
          { status: 429 }
        );
      }
      if (last.contentHash === contentHash) {
        return NextResponse.json(
          { error: "Duplicate message detected" },
          { status: 409 }
        );
      }
    }
    recentMessageHashes.set(key, { contentHash, ts: now });

    // Determine recipient
    const recipientId =
      match.user1._id.toString() === userId ? match.user2._id : match.user1._id;

    // Create message
    interface MessageData {
      match: string;
      sender: string;
      recipient: string;
      content: string;
      type: string;
      isEncrypted?: boolean;
      encryptedContent?: string;
      iv?: string;
      keyId?: string;
      disappearingDuration?: number;
      disappearsAt?: Date;
    }

    const messageData: MessageData = {
      match: matchId,
      sender: userId,
      recipient: recipientId,
      content: isEncrypted ? "" : content, // Store empty content for encrypted messages
      type,
    };

    // Add encryption fields if this is an encrypted message
    if (isEncrypted) {
      messageData.isEncrypted = true;
      messageData.encryptedContent = encryptedContent;
      messageData.iv = iv;
      if (keyId) {
        messageData.keyId = keyId;
      }
    }

    // Add disappearing message fields if provided
    if (disappearingDuration && disappearsAt) {
      messageData.disappearingDuration = disappearingDuration;
      messageData.disappearsAt = new Date(disappearsAt);
    }

    const message = new Message(messageData);

    await message.save();

    // Update match's last message timestamp
    match.lastMessageAt = new Date();
    await match.save();

    // Populate sender info for response
    await message.populate("sender", "firstName");

    // Format response
    const formattedMessage = {
      id: message._id,
      content: message.content,
      type: message.type,
      media: message.media,
      sender: {
        id: message.sender._id,
        firstName: message.sender.firstName,
        isCurrentUser: true,
      },
      readStatus: message.readStatus,
      createdAt: message.createdAt,
      disappearingDuration: message.disappearingDuration,
      disappearsAt: message.disappearsAt,
      // Include encryption fields in response
      isEncrypted: message.isEncrypted,
      encryptedContent: message.encryptedContent,
      iv: message.iv,
      keyId: message.keyId,
    };

    return NextResponse.json(
      {
        message: formattedMessage,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Send message error:", error);

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

// Delete a message
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get("messageId");

    if (!messageId) {
      return NextResponse.json(
        { error: "Message ID is required" },
        { status: 400 }
      );
    }

    // Find message and verify ownership
    const message = await Message.findOne({
      _id: messageId,
      sender: userId,
      isDeleted: false,
    });

    if (!message) {
      return NextResponse.json(
        { error: "Message not found or you are not authorized to delete it" },
        { status: 404 }
      );
    }

    // Soft delete the message
    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    return NextResponse.json(
      { message: "Message deleted successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Delete message error:", error);

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
