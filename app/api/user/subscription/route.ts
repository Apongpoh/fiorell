import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyAuth } from "@/lib/auth";
import { getUserSubscription, getUserFeatureLimits, getUserDailyUsage, isUserInGracePeriod } from "@/lib/subscription";

// Get user's subscription status and limits
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    // Get subscription info, limits, and current usage
    const [subscriptionInfo, limits, usage, isInGracePeriod] = await Promise.all([
      getUserSubscription(userId),
      getUserFeatureLimits(userId),
      getUserDailyUsage(userId),
      isUserInGracePeriod(userId),
    ]);

    return NextResponse.json(
      {
        subscription: subscriptionInfo,
        limits,
        usage,
        status: subscriptionInfo.isActive ? "active" : "inactive",
        hasPremium: subscriptionInfo.hasPremium,
        hasPremiumPlus: subscriptionInfo.hasPremiumPlus,
        isInGracePeriod,
        canUseAdvancedFilters: subscriptionInfo.hasPremium || subscriptionInfo.hasPremiumPlus || isInGracePeriod,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get subscription status error:", error);

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