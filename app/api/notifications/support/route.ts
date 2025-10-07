import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SupportTicket from "@/models/SupportTicket";
import User from "@/models/User";
import emailService from "@/lib/emailService";
import jwt from "jsonwebtoken";
import logger from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { message, ticketId } = await request.json();

    // Get auth token
    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify user
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
    };
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find ticket
    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Check if user owns the ticket
    if (ticket.userId.toString() !== decoded.userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Send real-time notification to support team
    await sendNotificationToSupport({
      type: "new_message",
      ticketId: ticket._id,
      ticketSubject: ticket.subject,
      userName: user.name || "Unknown User",
      userMessage: message.content,
      priority: ticket.priority,
      timestamp: new Date().toISOString(),
    });

    // Send email notification if enabled
    if (process.env.ENABLE_EMAIL_NOTIFICATIONS === "true") {
      await emailService.sendSupportNotification({
        ticketId: ticket._id,
        ticketSubject: ticket.subject,
        userName: user.name || "Unknown User",
        userMessage: message.content,
        priority: ticket.priority,
        userEmail: user.email,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending notification:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}

// Send real-time notification to support team
async function sendNotificationToSupport(data: {
  type: string;
  ticketId: string;
  ticketSubject: string;
  userName: string;
  userMessage: string;
  priority: string;
  timestamp: string;
}) {
  try {
    // In a real implementation, you would use WebSockets, Server-Sent Events,
    // or a real-time service like Pusher, Socket.io, or Firebase

    // For now, we'll store notifications in the database
    const notification = {
      type: data.type,
      title: `New message from ${data.userName}`,
      message: `${data.ticketSubject}: ${data.userMessage.substring(0, 100)}${
        data.userMessage.length > 100 ? "..." : ""
      }`,
      priority: data.priority,
      ticketId: data.ticketId,
      timestamp: data.timestamp,
      read: false,
      recipients: ["support_team"], // In real app, this would be specific support agent IDs
    };

    // Store in database for support team to retrieve
    // You could also implement WebSocket broadcasting here
    logger.info("Storing support notification:", { metadata: notification });

    // TODO: Implement actual real-time notification system
    // Example with Socket.io:
    // io.to("support-team").emit("new_support_message", notification);
  } catch (error) {
    logger.error("Error sending real-time notification:", {
      action: "send_real_time_notification_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
}
