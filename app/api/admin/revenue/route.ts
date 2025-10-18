import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Payment from "@/models/Payment";
import CryptoPayment from "@/models/CryptoPayment";
import Subscription from "@/models/Subscription";
import CryptoSubscription from "@/models/CryptoSubscription";
import Boost from "@/models/Boost";
import { verifyToken } from "@/lib/auth";

interface DailyPaymentData {
  date: string;
  amount: number;
  planId?: string;
  cryptocurrency?: string;
  planType?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    await connectDB();
    
    const user = await User.findById(decoded.userId);
    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30d";

    // Calculate date range
    const now = new Date();
    const daysBack = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : 365;
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    // Get Lemon Squeezy payments (paid status)
    const lemonSqueezyPayments = await Payment.aggregate([
      {
        $match: {
          status: "paid",
          paidAt: { $gte: startDate, $lte: now }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          count: { $sum: 1 },
          dailyData: {
            $push: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } },
              amount: "$amount",
              planId: "$planId"
            }
          }
        }
      }
    ]);

    // Get cryptocurrency payments (confirmed status)
    const cryptoPayments = await CryptoPayment.aggregate([
      {
        $match: {
          status: "confirmed",
          confirmedAt: { $gte: startDate, $lte: now }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amountUSD" },
          count: { $sum: 1 },
          bitcoinRevenue: {
            $sum: {
              $cond: [{ $eq: ["$cryptocurrency", "bitcoin"] }, "$amountUSD", 0]
            }
          },
          moneroRevenue: {
            $sum: {
              $cond: [{ $eq: ["$cryptocurrency", "monero"] }, "$amountUSD", 0]
            }
          },
          dailyData: {
            $push: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$confirmedAt" } },
              amount: "$amountUSD",
              cryptocurrency: "$cryptocurrency",
              planType: "$planType"
            }
          }
        }
      }
    ]);

    // Calculate total revenue from all sources
    const lemonRevenue = lemonSqueezyPayments[0]?.totalRevenue || 0;
    const cryptoRevenue = cryptoPayments[0]?.totalRevenue || 0;
    const totalRevenue = lemonRevenue + cryptoRevenue;

    // Get active subscriptions for user counts
    const activeSubscriptions = await Subscription.countDocuments({
      status: "active",
      currentPeriodEnd: { $gte: now }
    });

    const activeCryptoSubscriptions = await CryptoSubscription.countDocuments({
      status: "active",
      currentPeriodEnd: { $gte: now }
    });

    const totalActiveSubscriptions = activeSubscriptions + activeCryptoSubscriptions;
    const totalUsers = await User.countDocuments();

    // Previous period for comparison
    const previousPeriodStart = new Date(startDate.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    
    const previousLemonPayments = await Payment.aggregate([
      {
        $match: {
          status: "paid",
          paidAt: { $gte: previousPeriodStart, $lt: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" }
        }
      }
    ]);

    const previousCryptoPayments = await CryptoPayment.aggregate([
      {
        $match: {
          status: "confirmed",
          confirmedAt: { $gte: previousPeriodStart, $lt: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amountUSD" }
        }
      }
    ]);

    const previousRevenue = (previousLemonPayments[0]?.totalRevenue || 0) + 
                           (previousCryptoPayments[0]?.totalRevenue || 0);
    
    // Calculate growth
    const revenueGrowth = previousRevenue > 0 ? 
      Math.round(((totalRevenue - previousRevenue) / previousRevenue) * 100) : 0;

    // Generate daily revenue data by combining both payment types
    const dailyRevenueMap = new Map();
    
    // Process Lemon Squeezy daily data
    if (lemonSqueezyPayments[0]?.dailyData) {
      lemonSqueezyPayments[0].dailyData.forEach((payment: DailyPaymentData) => {
        const date = payment.date;
        if (!dailyRevenueMap.has(date)) {
          dailyRevenueMap.set(date, 0);
        }
        dailyRevenueMap.set(date, dailyRevenueMap.get(date) + payment.amount);
      });
    }

    // Process crypto daily data
    if (cryptoPayments[0]?.dailyData) {
      cryptoPayments[0].dailyData.forEach((payment: DailyPaymentData) => {
        const date = payment.date;
        if (!dailyRevenueMap.has(date)) {
          dailyRevenueMap.set(date, 0);
        }
        dailyRevenueMap.set(date, dailyRevenueMap.get(date) + payment.amount);
      });
    }

    // Create daily revenue array with all dates in range
    const dailyRevenue = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateString = date.toISOString().split('T')[0];
      const value = dailyRevenueMap.get(dateString) || 0;
      dailyRevenue.push({
        date: dateString,
        value: Math.round(value * 100) / 100
      });
    }

    // Get boost revenue (from Boost model)
    const boostRevenue = await Boost.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: now }
        }
      },
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 }
        }
      }
    ]);

    // Calculate boost revenue (estimated pricing)
    const boostPricing = { daily: 2.99, weekly: 9.99, premium: 19.99 };
    const totalBoostRevenue = boostRevenue.reduce((total, boost) => {
      return total + (boost.count * (boostPricing[boost._id as keyof typeof boostPricing] || 0));
    }, 0);

    // Revenue breakdown by source
    const breakdown = {
      subscriptions: Math.round((lemonRevenue + cryptoRevenue) * 100) / 100,
      boosts: Math.round(totalBoostRevenue * 100) / 100,
      cryptocurrency: {
        bitcoin: Math.round((cryptoPayments[0]?.bitcoinRevenue || 0) * 100) / 100,
        monero: Math.round((cryptoPayments[0]?.moneroRevenue || 0) * 100) / 100
      },
      lemonSqueezy: Math.round(lemonRevenue * 100) / 100
    };

    // Get top paying users from both payment sources
    const topLemonUsers = await Payment.aggregate([
      {
        $match: {
          status: "paid",
          paidAt: { $gte: startDate, $lte: now }
        }
      },
      {
        $group: {
          _id: "$userId",
          totalPaid: { $sum: "$amount" },
          paymentCount: { $sum: 1 }
        }
      },
      {
        $sort: { totalPaid: -1 }
      },
      {
        $limit: 10
      }
    ]);

    const topCryptoUsers = await CryptoPayment.aggregate([
      {
        $match: {
          status: "confirmed",
          confirmedAt: { $gte: startDate, $lte: now }
        }
      },
      {
        $group: {
          _id: "$userId",
          totalPaid: { $sum: "$amountUSD" },
          paymentCount: { $sum: 1 }
        }
      },
      {
        $sort: { totalPaid: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // Combine and get user details for top users
    const allTopUsers = [...topLemonUsers, ...topCryptoUsers];
    const userRevenueMap = new Map();
    
    allTopUsers.forEach(user => {
      const userId = user._id.toString();
      if (userRevenueMap.has(userId)) {
        userRevenueMap.set(userId, {
          ...userRevenueMap.get(userId),
          totalPaid: userRevenueMap.get(userId).totalPaid + user.totalPaid,
          paymentCount: userRevenueMap.get(userId).paymentCount + user.paymentCount
        });
      } else {
        userRevenueMap.set(userId, user);
      }
    });

    const topUserIds = Array.from(userRevenueMap.entries())
      .sort((a, b) => b[1].totalPaid - a[1].totalPaid)
      .slice(0, 5)
      .map(([userId]) => userId);

    const topUsersDetails = await User.find({
      _id: { $in: topUserIds }
    }).select('firstName lastName email createdAt');

    const topUsers = topUsersDetails.map(user => {
      const revenueData = userRevenueMap.get(user._id.toString());
      return {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        revenue: Math.round((revenueData?.totalPaid || 0) * 100) / 100,
        joinDate: user.createdAt
      };
    });

    const revenueData = {
      period: period,
      overview: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        growth: revenueGrowth,
        averagePerUser: totalUsers > 0 ? Math.round((totalRevenue / totalUsers) * 100) / 100 : 0,
        premiumUsers: totalActiveSubscriptions,
        conversionRate: totalUsers > 0 ? Math.round((totalActiveSubscriptions / totalUsers) * 10000) / 100 : 0
      },
      breakdown,
      charts: {
        daily: dailyRevenue
      },
      topUsers,
      paymentMethods: {
        lemonSqueezy: {
          revenue: Math.round(lemonRevenue * 100) / 100,
          count: lemonSqueezyPayments[0]?.count || 0
        },
        cryptocurrency: {
          revenue: Math.round(cryptoRevenue * 100) / 100,
          count: cryptoPayments[0]?.count || 0,
          bitcoin: Math.round((cryptoPayments[0]?.bitcoinRevenue || 0) * 100) / 100,
          monero: Math.round((cryptoPayments[0]?.moneroRevenue || 0) * 100) / 100
        }
      }
    };

    return NextResponse.json(revenueData);

  } catch (error) {
    console.error("Error fetching revenue data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}