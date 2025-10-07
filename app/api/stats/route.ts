import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Interaction from "@/models/Interaction";
import Message from "@/models/Message";
import User from "@/models/User";
import ProfileView from "@/models/ProfileView";
import logger from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    // Calculate likes given today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const likesToday = await Interaction.countDocuments({
      userId,
      action: { $in: ["like", "super_like"] },
      createdAt: { $gte: today },
    });

    // Get the user's current total stats
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get active matches (has messages in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeMatches = await Interaction.countDocuments({
      userId,
      isMatch: true,
      updatedAt: { $gte: thirtyDaysAgo },
    });

    // Get unread messages (match Message schema: recipient + readStatus.isRead)
    const unreadMessages = await Message.countDocuments({
      recipient: userId,
      "readStatus.isRead": false,
      isDeleted: false,
    });

    // Get today's profile views from unique viewers
    const viewsToday = await ProfileView.countDocuments({
      targetUserId: userId,
      createdAt: { $gte: today },
    });

    // Get total profile views
    const totalViews = await ProfileView.countDocuments({
      targetUserId: userId,
    });

    // Comprehensive stats response
    const stats = {
      today: {
        likes: likesToday,
        views: viewsToday,
      },
      totals: {
        receivedLikes: user?.stats?.totalLikesReceived || 0,
        receivedSuperLikes: user?.stats?.totalSuperLikesReceived || 0,
        matches: user?.stats?.totalMatches || 0,
        profileViews: totalViews,
      },
      active: {
        matches: activeMatches,
        unreadMessages: unreadMessages,
      },
    };

    return NextResponse.json(stats);
  } catch (error) {
    logger.error("Stats error:", {
      action: "get_user_stats_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
