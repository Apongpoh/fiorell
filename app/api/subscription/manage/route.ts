import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import lemonSqueezyService from "@/lib/lemonSqueezy";
import { verifyAuth } from "@/lib/auth";
import User from "@/models/User";
import Subscription from "@/models/Subscription";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { userId } = verifyAuth(request);

    // Get user's current subscription
    const subscription = await Subscription.findOne({
      userId,
      status: { $in: ["active", "on_trial", "past_due"] },
    }).sort({ createdAt: -1 });

    if (!subscription) {
      return NextResponse.json({
        hasSubscription: false,
        subscription: null,
      });
    }

    // Get plan details
    const plan = lemonSqueezyService.getPlan(subscription.planId);

    return NextResponse.json({
      hasSubscription: true,
      subscription: {
        id: subscription._id,
        planId: subscription.planId,
        planName: plan?.name,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        price: subscription.price,
        currency: subscription.currency,
        interval: subscription.interval,
        isActive: subscription.isActive,
        isInTrial: subscription.isInTrial,
        daysRemaining: subscription.daysRemaining,
        features: plan?.features || [],
      },
    });
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription status" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB();
    const { userId } = verifyAuth(request);

    // Get user's active subscription
    const subscription = await Subscription.findOne({
      userId,
      status: { $in: ["active", "on_trial"] },
    });

    if (!subscription) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    // Cancel subscription with Lemon Squeezy
    const result = await lemonSqueezyService.cancelSubscription(
      subscription.lemonsqueezySubscriptionId
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Update subscription in database
    subscription.cancelAtPeriodEnd = true;
    subscription.cancelledAt = new Date();
    await subscription.save();

    // Update user subscription status
    await User.findByIdAndUpdate(userId, {
      "subscription.cancelAtPeriodEnd": true,
    });

    return NextResponse.json({
      message: "Subscription cancelled successfully",
      subscription: {
        cancelAtPeriodEnd: true,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    });
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { userId } = verifyAuth(request);
    const { action } = await request.json();

    if (action === "resume") {
      // Resume a cancelled subscription
      const subscription = await Subscription.findOne({
        userId,
        cancelAtPeriodEnd: true,
        status: { $in: ["active", "on_trial"] },
      });

      if (!subscription) {
        return NextResponse.json(
          { error: "No cancelled subscription found" },
          { status: 404 }
        );
      }

      // Resume subscription with Lemon Squeezy
      const result = await lemonSqueezyService.resumeSubscription(
        subscription.lemonsqueezySubscriptionId
      );

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }

      // Update subscription in database
      subscription.cancelAtPeriodEnd = false;
      subscription.cancelledAt = undefined;
      await subscription.save();

      // Update user subscription status
      await User.findByIdAndUpdate(userId, {
        "subscription.cancelAtPeriodEnd": false,
      });

      return NextResponse.json({
        message: "Subscription resumed successfully",
        subscription: {
          cancelAtPeriodEnd: false,
          status: subscription.status,
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    logger.error("Error managing subscription:", {
      action: "manage_subscription_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return NextResponse.json(
      { error: "Failed to manage subscription" },
      { status: 500 }
    );
  }
}
