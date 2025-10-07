import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import SupportTicket from "@/models/SupportTicket";
import SupportMessage from "@/models/SupportMessage";
import { verifyAuth } from "@/lib/auth";
import { isObjectId } from "@/lib/validators";
import { logger } from "@/lib/logger";

// Get support conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);
    const { ticketId } = await params;

    if (!isObjectId(ticketId)) {
      return NextResponse.json({ error: "Invalid ticket ID" }, { status: 400 });
    }

    // Check if ticket belongs to user
    const ticket = await SupportTicket.findOne({
      _id: ticketId,
      userId: userId,
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Support ticket not found" },
        { status: 404 }
      );
    }

    // Get all messages for this ticket
    const messages = await SupportMessage.find({ ticketId })
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({
      ticket: {
        id: ticket._id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        type: ticket.type,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      },
      messages: messages.map((msg) => ({
        id: msg._id,
        content: msg.content,
        isFromSupport: msg.isFromSupport,
        createdAt: msg.createdAt,
        readByUser: msg.readByUser,
        readBySupport: msg.readBySupport,
      })),
    });
  } catch (error: unknown) {
    logger.error("Get support conversation error:", {
      action: "get_support_conversation_failed",
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

// Send message in support conversation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);
    const { ticketId } = await params;
    const body = await request.json();
    const { content } = body;

    if (!isObjectId(ticketId)) {
      return NextResponse.json({ error: "Invalid ticket ID" }, { status: 400 });
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: "Message must be 2000 characters or less" },
        { status: 400 }
      );
    }

    // Check if ticket belongs to user and is not closed
    const ticket = await SupportTicket.findOne({
      _id: ticketId,
      userId: userId,
    });

    if (!ticket) {
      return NextResponse.json(
        { error: "Support ticket not found" },
        { status: 404 }
      );
    }

    if (ticket.status === "closed") {
      return NextResponse.json(
        { error: "Cannot send messages to closed tickets" },
        { status: 400 }
      );
    }

    // Create new message
    const message = new SupportMessage({
      ticketId,
      content: content.trim(),
      isFromSupport: false,
      readByUser: true,
      readBySupport: false,
      createdAt: new Date(),
    });

    await message.save();

    // Update ticket status to indicate user response
    if (ticket.status === "pending") {
      ticket.status = "open";
      ticket.updatedAt = new Date();
      await ticket.save();
    }

    // Trigger auto-response if enabled
    let autoResponse = null;
    try {
      const autoResponseRes = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/support/auto-response`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: content,
            ticketId: ticketId,
          }),
        }
      );

      if (autoResponseRes.ok) {
        const autoData = await autoResponseRes.json();
        autoResponse = autoData.autoResponse;
      }
    } catch (error) {
      logger.warn("Auto-response failed", {
        action: "auto_response_failed",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }

    // Send notification to support team
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/support`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: request.headers.get("authorization") || "",
          },
          body: JSON.stringify({
            message: message,
            ticketId: ticketId,
          }),
        }
      );
    } catch (error) {
      logger.warn("Notification failed", {
        action: "notification_failed",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }

    return NextResponse.json({
      message: {
        id: message._id,
        content: message.content,
        isFromSupport: message.isFromSupport,
        createdAt: message.createdAt,
        readByUser: message.readByUser,
        readBySupport: message.readBySupport,
      },
      autoResponse,
    });
  } catch (error: unknown) {
    logger.error("Send support message error:", {
      action: "send_support_message_failed",
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
