import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyAuth } from "@/lib/auth";
import Boost from "@/models/Boost";
import { checkDailyLimits, getUserSubscription } from "@/lib/subscription";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    const body = await request.json();
    const { boostType = "daily" } = body; // daily, weekly, or premium

    // Validate boost type
    if (!["daily", "weekly", "premium"].includes(boostType)) {
      return NextResponse.json(
        { error: "Invalid boost type. Must be daily, weekly, or premium." },
        { status: 400 }
      );
    }

    // Check subscription permissions
    const subscription = await getUserSubscription(userId);
    
    if (boostType === "weekly" && !subscription.hasPremium) {
      return NextResponse.json(
        {
          error: "Weekly boosts require Premium subscription",
          code: "UPGRADE_REQUIRED",
          upgradeRequired: true
        },
        { status: 403 }
      );
    }

    if (boostType === "premium" && !subscription.hasPremiumPlus) {
      return NextResponse.json(
        {
          error: "Premium boosts require Premium Plus subscription",
          code: "UPGRADE_REQUIRED",
          upgradeRequired: true
        },
        { status: 403 }
      );
    }

    // Check daily limits for daily boosts only
    if (boostType === "daily") {
      const boostCheck = await checkDailyLimits(userId, 'boost');
      if (!boostCheck.allowed) {
        return NextResponse.json(
          {
            error: boostCheck.reason,
            code: "DAILY_LIMIT_EXCEEDED",
            upgradeRequired: boostCheck.upgradeRequired,
            currentUsage: boostCheck.currentUsage,
            limit: boostCheck.limit
          },
          { status: 403 }
        );
      }
    }

    // Check for existing active boost of the same type
    const existingBoost = await Boost.findOne({
      userId: userId,
      type: boostType,
      status: "active",
      expiresAt: { $gt: new Date() }
    });

    if (existingBoost) {
      const remainingTime = Math.ceil((existingBoost.expiresAt.getTime() - new Date().getTime()) / (1000 * 60));
      return NextResponse.json(
        {
          error: `You already have an active ${boostType} boost for ${remainingTime} more minutes.`,
          code: "BOOST_ALREADY_ACTIVE",
          remainingTime
        },
        { status: 409 }
      );
    }

    // Create new boost
    const boost = new Boost({
      userId,
      type: boostType,
      status: "active",
      activatedAt: new Date(),
    });

    await boost.save();

    const remainingTime = Math.ceil((boost.expiresAt.getTime() - new Date().getTime()) / (1000 * 60));

    return NextResponse.json(
      {
        message: `${boostType.charAt(0).toUpperCase() + boostType.slice(1)} boost activated successfully!`,
        boost: {
          id: boost._id,
          type: boostType,
          status: boost.status,
          activatedAt: boost.activatedAt,
          expiresAt: boost.expiresAt,
          remainingTime
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Profile boost error:", error);

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

// Get user's active boost status
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    // Get active boosts
    const activeBoosts = await Boost.find({
      userId: userId,
      status: "active",
      expiresAt: { $gt: new Date() }
    });

    // Get today's boost usage for daily limits
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const dailyBoostsUsed = await Boost.countDocuments({
      userId: userId,
      type: "daily",
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const subscription = await getUserSubscription(userId);
    const hasActiveBoost = activeBoosts.length > 0;

    if (!hasActiveBoost) {
      return NextResponse.json(
        { 
          hasActiveBoost: false,
          dailyBoostsUsed,
          dailyBoostsLimit: subscription.hasPremiumPlus ? -1 : 
                           subscription.hasPremium ? 5 : 1
        },
        { status: 200 }
      );
    }

    // Return info about active boosts
    const primaryBoost = activeBoosts[0]; // Get the first active boost for compatibility
    const boostInfo = activeBoosts.map(boost => ({
      id: boost._id,
      type: boost.type,
      activatedAt: boost.activatedAt,
      expiresAt: boost.expiresAt,
      remainingTime: Math.ceil((boost.expiresAt.getTime() - new Date().getTime()) / (1000 * 60))
    }));

    return NextResponse.json(
      {
        hasActiveBoost: true,
        boostType: primaryBoost.type, // For frontend compatibility
        expiresAt: primaryBoost.expiresAt, // For frontend compatibility
        boosts: boostInfo, // Full boost details
        dailyBoostsUsed,
        dailyBoostsLimit: subscription.hasPremiumPlus ? -1 : 
                         subscription.hasPremium ? 5 : 1
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Get boost status error:", error);

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