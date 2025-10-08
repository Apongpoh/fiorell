// app/api/subscription/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { SubscriptionManager } from "@/lib/subscriptionManager";
import connectDB from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { userId } = verifyAuth(request);

    const subscription = await SubscriptionManager.getUserSubscription(userId);
    const limits = await SubscriptionManager.getUserLimits(userId);

    return NextResponse.json({
      subscription: subscription.user,
      lemonsqueezy: subscription.lemonsqueezy,
      limits,
      features: {
        canSeeWhoLiked: limits.canSeeWhoLiked,
        canUseIncognito: limits.canUseIncognito,
        canUseTravelMode: limits.canUseTravelMode,
        canMessageBeforeMatch: limits.canMessageBeforeMatch,
        hasUnlimitedLikes: limits.dailyLikes === -1,
        hasUnlimitedSuperLikes: limits.superLikes === -1,
        hasUnlimitedBoosts: limits.boosts === -1
      }
    });
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    
    if (error instanceof Error && error.message.includes("token")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to fetch subscription status" },
      { status: 500 }
    );
  }
}

// Sync subscription data
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { userId } = verifyAuth(request);

    const syncedSubscription = await SubscriptionManager.syncUserSubscription(userId);

    return NextResponse.json({
      message: "Subscription synced successfully",
      subscription: syncedSubscription
    });
  } catch (error) {
    console.error("Error syncing subscription:", error);
    
    if (error instanceof Error && error.message.includes("token")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to sync subscription" },
      { status: 500 }
    );
  }
}