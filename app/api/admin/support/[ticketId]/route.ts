import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SupportTicket from "@/models/SupportTicket";
import SupportMessage from "@/models/SupportMessage";
import User from "@/models/User";
import jwt from "jsonwebtoken";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    await connectDB();
    const { ticketId } = await params;

    // Get auth token
    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Verify token and check admin status
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get ticket with user info
    const ticketWithUser = await SupportTicket.aggregate([
      { $match: { _id: ticketId } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userInfo"
        }
      },
      {
        $addFields: {
          userName: { $arrayElemAt: ["$userInfo.name", 0] }
        }
      },
      {
        $project: {
          userInfo: 0
        }
      }
    ]);

    const ticket = ticketWithUser[0];
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Get messages
    const messages = await SupportMessage.find({ ticketId })
      .sort({ createdAt: 1 })
      .lean();

    // Mark all user messages as read by support
    await SupportMessage.updateMany(
      { ticketId, isFromSupport: false, readBySupport: false },
      { readBySupport: true }
    );

    return NextResponse.json({
      ticket,
      messages: messages.map(msg => ({
        id: msg._id,
        content: msg.content,
        sender: msg.isFromSupport ? "support" : "user",
        senderName: msg.isFromSupport ? msg.supportAgentName : ticket.userName,
        agentName: msg.supportAgentName,
        timestamp: msg.createdAt,
      }))
    });
  } catch (error) {
    console.error("Error fetching admin ticket:", error);
    return NextResponse.json(
      { error: "Failed to fetch ticket" },
      { status: 500 }
    );
  }
}