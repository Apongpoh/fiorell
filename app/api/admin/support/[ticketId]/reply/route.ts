import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import SupportTicket from "@/models/SupportTicket";
import SupportMessage from "@/models/SupportMessage";
import { verifyAuth } from "@/lib/auth";
import { isObjectId } from "@/lib/validators";

// Admin endpoint to reply to support tickets
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    await connectToDatabase();

    // Verify authentication (in a real app, you'd check for admin role)
    const { userId } = verifyAuth(request);
    const { ticketId } = await params;
    const body = await request.json();
    const { content, agentName = "Support Team", updateStatus } = body;

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

    // Check if ticket exists
    const ticket = await SupportTicket.findById(ticketId);

    if (!ticket) {
      return NextResponse.json(
        { error: "Support ticket not found" },
        { status: 404 }
      );
    }

    // Create support message
    const message = new SupportMessage({
      ticketId,
      content: content.trim(),
      isFromSupport: true,
      supportAgentId: userId,
      supportAgentName: agentName,
      readByUser: false,
      readBySupport: true,
      createdAt: new Date(),
    });

    await message.save();

    // Update ticket status if specified
    if (updateStatus && ["open", "pending", "in-progress", "closed"].includes(updateStatus)) {
      ticket.status = updateStatus;
      ticket.updatedAt = new Date();
      await ticket.save();
    } else if (ticket.status === "open") {
      // Auto-update to in-progress when support replies
      ticket.status = "in-progress";
      ticket.updatedAt = new Date();
      await ticket.save();
    }

    return NextResponse.json({
      message: {
        id: message._id,
        content: message.content,
        isFromSupport: message.isFromSupport,
        supportAgentName: message.supportAgentName,
        createdAt: message.createdAt,
        readByUser: message.readByUser,
        readBySupport: message.readBySupport,
      },
      ticket: {
        status: ticket.status,
        updatedAt: ticket.updatedAt,
      },
    });
  } catch (error: unknown) {
    console.error("Admin support reply error:", error);

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