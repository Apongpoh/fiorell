import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import User from "@/models/User";
import connectToMongoDB from "@/lib/mongodb";
import {
  sendPushNotificationToUser,
  createNotificationPayload,
} from "@/lib/pushNotifications";

interface SendNotificationRequest {
  recipientId: string;
  type: "match" | "message" | "like" | "profile_view";
  data: {
    senderName?: string;
    messagePreview?: string;
    matchUserName?: string;
    likerName?: string;
    viewerName?: string;
    chatId?: string;
    userId?: string;
  };
}

// Send push notification
export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB();

    // Get token from Authorization header
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const { recipientId, type, data }: SendNotificationRequest =
      await request.json();

    if (!recipientId || !type) {
      return NextResponse.json(
        { error: "Recipient ID and type are required" },
        { status: 400 }
      );
    }

    // Get recipient user with notification settings and push subscriptions
    const recipient = await User.findById(recipientId).select(
      "notificationSettings pushSubscriptions firstName"
    );

    if (!recipient) {
      return NextResponse.json(
        { error: "Recipient not found" },
        { status: 404 }
      );
    }

    // Check if user has enabled push notifications for this type
    const notificationSettings = recipient.notificationSettings;
    let shouldSendPush = false;

    switch (type) {
      case "match":
        shouldSendPush = notificationSettings?.matches?.push ?? true;
        break;
      case "message":
        shouldSendPush = notificationSettings?.messages?.push ?? true;
        break;
      case "like":
        shouldSendPush = notificationSettings?.likes?.push ?? true;
        break;
      case "profile_view":
        shouldSendPush = notificationSettings?.views?.push ?? false;
        break;
    }

    if (!shouldSendPush) {
      return NextResponse.json({ message: "Notification disabled by user" });
    }

    // Check quiet hours
    if (notificationSettings?.quietHours?.enabled) {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
      const startTime = notificationSettings.quietHours.startTime;
      const endTime = notificationSettings.quietHours.endTime;

      // Simple time comparison (doesn't handle midnight crossing perfectly)
      if (currentTime >= startTime || currentTime <= endTime) {
        return NextResponse.json({
          message: "Notification sent during quiet hours",
        });
      }
    }

    // Get push subscriptions
    const subscriptions = recipient.pushSubscriptions || [];

    if (subscriptions.length === 0) {
      return NextResponse.json({ message: "No push subscriptions found" });
    }

    // Create notification payload
    let payload;
    switch (type) {
      case "match":
        payload = createNotificationPayload.newMatch(
          data.matchUserName || "Someone"
        );
        break;
      case "message":
        payload = createNotificationPayload.newMessage(
          data.senderName || "Someone",
          data.messagePreview || "Sent you a message"
        );
        if (data.chatId) {
          if (!payload.data) payload.data = {};
          payload.data.chatId = data.chatId;
        }
        break;
      case "like":
        payload = createNotificationPayload.newLike(
          data.likerName || "Someone"
        );
        if (data.userId) {
          if (!payload.data) payload.data = {};
          payload.data.userId = data.userId;
        }
        break;
      case "profile_view":
        payload = createNotificationPayload.profileView(
          data.viewerName || "Someone"
        );
        if (data.userId) {
          if (!payload.data) payload.data = {};
          payload.data.userId = data.userId;
        }
        break;
      default:
        return NextResponse.json(
          { error: "Invalid notification type" },
          { status: 400 }
        );
    }

    // Send push notifications
    const results = await sendPushNotificationToUser(subscriptions, payload);

    return NextResponse.json({
      message: "Push notifications sent",
      results: {
        sent: results.sent,
        failed: results.failed,
        total: subscriptions.length,
      },
    });
  } catch (error: unknown) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to send push notification" },
      { status: 500 }
    );
  }
}
