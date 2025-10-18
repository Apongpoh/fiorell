import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Match from "@/models/Match";
import Message from "@/models/Message";
import Interaction from "@/models/Interaction";
import Report from "@/models/Report";

interface AggregationResult {
  _id: string;
  count: number;
}

export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Connect to database
    await connectDB();

    // Check if user is admin
    const adminUser = await User.findById(decoded.userId);
    if (!adminUser || !adminUser.isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get period from query params (default: 30d)
    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "30d";
    
    // Calculate date range
    const now = new Date();
    const daysBack = parseInt(period.replace('d', '')) || 30;
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    // Get analytics data
    const [
      totalUsers,
      newUsers,
      activeUsers,
      totalMatches,
      newMatches,
      totalMessages,
      newMessages,
      totalLikes,
      newLikes,
      totalReports,
      newReports,
      userGrowth,
      matchesOverTime,
      messagesOverTime,
      likesOverTime
    ] = await Promise.all([
      // Total users
      User.countDocuments(),
      
      // New users in period
      User.countDocuments({
        createdAt: { $gte: startDate }
      }),
      
      // Active users (logged in within period)
      User.countDocuments({
        lastSeen: { $gte: startDate }
      }),
      
      // Total matches
      Match.countDocuments(),
      
      // New matches in period
      Match.countDocuments({
        createdAt: { $gte: startDate }
      }),
      
      // Total messages
      Message.countDocuments(),
      
      // New messages in period
      Message.countDocuments({
        createdAt: { $gte: startDate }
      }),
      
      // Total interactions (likes)
      Interaction.countDocuments({ type: "like" }),
      
      // New interactions (likes) in period
      Interaction.countDocuments({
        type: "like",
        createdAt: { $gte: startDate }
      }),
      
      // Total reports
      Report.countDocuments(),
      
      // New reports in period
      Report.countDocuments({
        createdAt: { $gte: startDate }
      }),
      
      // User growth over time (daily)
      User.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt"
              }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]),
      
      // Matches over time
      Match.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt"
              }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]),
      
      // Messages over time
      Message.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt"
              }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]),
      
      // Interactions (likes) over time
      Interaction.aggregate([
        {
          $match: {
            type: "like",
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt"
              }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ])
    ]);

    // Calculate growth percentages (compare with previous period)
    const previousPeriodStart = new Date(startDate.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    
    const [
      prevNewUsers,
      prevNewMatches,
      prevNewMessages,
      prevNewLikes
    ] = await Promise.all([
      User.countDocuments({
        createdAt: { $gte: previousPeriodStart, $lt: startDate }
      }),
      Match.countDocuments({
        createdAt: { $gte: previousPeriodStart, $lt: startDate }
      }),
      Message.countDocuments({
        createdAt: { $gte: previousPeriodStart, $lt: startDate }
      }),
      Interaction.countDocuments({
        type: "like",
        createdAt: { $gte: previousPeriodStart, $lt: startDate }
      })
    ]);

    // Calculate percentage changes
    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const analytics = {
      period,
      overview: {
        totalUsers,
        newUsers,
        activeUsers,
        totalMatches,
        newMatches,
        totalMessages,
        newMessages,
        totalLikes,
        newLikes,
        totalReports,
        newReports
      },
      growth: {
        users: calculateGrowth(newUsers, prevNewUsers),
        matches: calculateGrowth(newMatches, prevNewMatches),
        messages: calculateGrowth(newMessages, prevNewMessages),
        likes: calculateGrowth(newLikes, prevNewLikes)
      },
      charts: {
        userGrowth: userGrowth.map((item: AggregationResult) => ({
          date: item._id,
          value: item.count
        })),
        matches: matchesOverTime.map((item: AggregationResult) => ({
          date: item._id,
          value: item.count
        })),
        messages: messagesOverTime.map((item: AggregationResult) => ({
          date: item._id,
          value: item.count
        })),
        likes: likesOverTime.map((item: AggregationResult) => ({
          date: item._id,
          value: item.count
        }))
      }
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    );
  }
}