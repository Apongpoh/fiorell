import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyAuth } from "@/lib/auth";
import ProfileBoost from "@/models/ProfileBoost";
import { checkDailyLimits, getUserSubscription } from "@/lib/subscription";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    const body = await request.json();
    const { duration = 60 } = body; // default 1 hour

    // Check if user can use boosts
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

    // Check for existing active boost
    const existingBoost = await ProfileBoost.findOne({
      userId: userId,
      isActive: true,
      endTime: { $gt: new Date() }
    });

    if (existingBoost) {
      const remainingTime = Math.ceil((existingBoost.endTime.getTime() - new Date().getTime()) / (1000 * 60));
      return NextResponse.json(
        {
          error: `You already have an active boost for ${remainingTime} more minutes. Wait for it to expire before starting a new one.`,
          code: "BOOST_ALREADY_ACTIVE",
          remainingTime
        },
        { status: 409 }
      );
    }

    // Get subscription info to determine boost type
    const subscription = await getUserSubscription(userId);
    const boostType = subscription.hasPremiumPlus ? "premium" : 
                     subscription.hasPremium ? "weekly" : "daily";

    // Create new boost
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

    const boost = new ProfileBoost({
      userId,
      type: boostType,
      duration,
      startTime,
      endTime,
      isActive: true,
      cost: 0 // Free for premium users
    });

    await boost.save();

    return NextResponse.json(
      {
        message: "Profile boost activated successfully!",
        boost: {
          id: boost._id,
          type: boostType,
          duration,
          startTime,
          endTime,
          remainingTime: duration
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

    // Get active boost
    const activeBoost = await ProfileBoost.findOne({
      userId: userId,
      isActive: true,
      endTime: { $gt: new Date() }
    });

    if (!activeBoost) {
      return NextResponse.json(
        { hasActiveBoost: false },
        { status: 200 }
      );
    }

    const remainingTime = Math.ceil((activeBoost.endTime.getTime() - new Date().getTime()) / (1000 * 60));

    return NextResponse.json(
      {
        hasActiveBoost: true,
        boost: {
          id: activeBoost._id,
          type: activeBoost.type,
          duration: activeBoost.duration,
          startTime: activeBoost.startTime,
          endTime: activeBoost.endTime,
          remainingTime
        }
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