import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import SupportTicket from "@/models/SupportTicket";
import SupportMessage from "@/models/SupportMessage";
import { verifyAuth } from "@/lib/auth";
import { isObjectId } from "@/lib/validators";

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
      return NextResponse.json(
        { error: "Invalid ticket ID" },
        { status: 400 }
      );
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
    console.error("Get support conversation error:", error);

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
      return NextResponse.json(
        { error: "Invalid ticket ID" },
        { status: 400 }
      );
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

    return NextResponse.json({
      message: {
        id: message._id,
        content: message.content,
        isFromSupport: message.isFromSupport,
        createdAt: message.createdAt,
        readByUser: message.readByUser,
        readBySupport: message.readBySupport,
      },
    });
  } catch (error: unknown) {
    console.error("Send support message error:", error);

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