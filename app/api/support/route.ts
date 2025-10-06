import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyAuth } from "@/lib/auth";
import SupportTicket from "@/models/SupportTicket";
import User from "@/models/User";
import emailService from "@/lib/emailService";
// import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
// const ses = new SESClient({ region: process.env.AWS_REGION });

// Create a support ticket and send an email notification (placeholder)
export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { userId } = verifyAuth(req);
    const body = await req.json();
    const { subject, message, type = "email", priority = "medium" } = body || {};

    if (!subject || !message) {
      return NextResponse.json(
        { error: "Subject and message are required" },
        { status: 400 }
      );
    }

    // Validate type and priority
    if (!["chat", "email"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be 'chat' or 'email'" },
        { status: 400 }
      );
    }

    if (!["low", "medium", "high"].includes(priority)) {
      return NextResponse.json(
        { error: "Priority must be 'low', 'medium', or 'high'" },
        { status: 400 }
      );
    }

    const ticket = await SupportTicket.create({
      userId,
      subject: String(subject),
      message: String(message),
      type: String(type),
      priority: String(priority),
      status: "open",
    });

    // Create initial message from the ticket
    const SupportMessage = (await import("@/models/SupportMessage")).default;
    await SupportMessage.create({
      ticketId: ticket._id,
      content: String(message),
      isFromSupport: false,
      readByUser: true,
      readBySupport: false,
    });

    // Send email notification to support team
    if (process.env.ENABLE_EMAIL_NOTIFICATIONS === "true") {
      try {
        const user = await User.findById(userId);
        await emailService.sendNewTicketNotification({
          ticketId: ticket._id,
          ticketSubject: ticket.subject,
          userName: user?.name || "Unknown User",
          ticketType: ticket.type,
          priority: ticket.priority,
          description: String(message),
        });
      } catch (emailError) {
        console.error("Failed to send email notification:", emailError);
      }
    }

    return NextResponse.json({ ticket }, { status: 201 });
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

// Get current user's tickets
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { userId } = verifyAuth(req);
    const tickets = await SupportTicket.find({ userId })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ 
      tickets: tickets.map(ticket => ({
        id: ticket._id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority || "medium",
        type: ticket.type || "email",
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      }))
    }, { status: 200 });
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
