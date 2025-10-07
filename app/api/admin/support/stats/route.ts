import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SupportTicket from "@/models/SupportTicket";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import logger from "@/lib/logger";

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

    // Calculate stats
    const stats = await SupportTicket.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: {
            $sum: { $cond: [{ $eq: ["$status", "open"] }, 1, 0] },
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] },
          },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          closed: {
            $sum: { $cond: [{ $eq: ["$status", "closed"] }, 1, 0] },
          },
          highPriority: {
            $sum: { $cond: [{ $eq: ["$priority", "high"] }, 1, 0] },
          },
        },
      },
    ]);

    const result = stats[0] || {
      total: 0,
      open: 0,
      inProgress: 0,
      pending: 0,
      closed: 0,
      highPriority: 0,
    };

    return NextResponse.json({ stats: result });
  } catch (error) {
    logger.error("Error fetching admin stats:", {
      action: "admin_support_stats_fetch_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
