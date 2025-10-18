import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SupportTicket from "@/models/SupportTicket";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get auth token
    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify token and check admin status
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
    };
    const user = await User.findById(decoded.userId);

    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get tickets with user info and unread message counts
    const tickets = await SupportTicket.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $lookup: {
          from: "supportmessages",
          localField: "_id",
          foreignField: "ticketId",
          as: "messages",
        },
      },
      {
        $addFields: {
          id: { $toString: "$_id" },
          userName: { $arrayElemAt: ["$userInfo.name", 0] },
          unreadMessages: {
            $size: {
              $filter: {
                input: "$messages",
                cond: {
                  $and: [
                    { $eq: ["$$this.sender", "user"] },
                    { $eq: ["$$this.readBySupport", false] },
                  ],
                },
              },
            },
          },
          lastMessage: {
            $let: {
              vars: {
                lastMsg: { $arrayElemAt: [{ $slice: ["$messages", -1] }, 0] },
              },
              in: "$$lastMsg.content",
            },
          },
        },
      },
      {
        $project: {
          userInfo: 0,
          messages: 0,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    return NextResponse.json({ tickets });
  } catch (error) {
    logger.error("Error fetching admin tickets:", {
      action: "admin_get_tickets_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return NextResponse.json(
      { error: "Failed to fetch tickets" },
      { status: 500 }
    );
  }
}
