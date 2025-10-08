// app/api/subscription/upgrade/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import lemonSqueezyService from "@/lib/lemonSqueezy";
import { verifyAuth } from "@/lib/auth";
import User from "@/models/User";
import Subscription from "@/models/Subscription";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { userId } = verifyAuth(request);
    const { planId, successUrl } = await request.json();

    if (!planId) {
      return NextResponse.json(
        { error: "Plan ID is required" },
        { status: 400 }
      );
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get plan details
    const plan = lemonSqueezyService.getPlan(planId);
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
    }

    // Check if user already has an active subscription
    const existingSubscription = await Subscription.findOne({
      userId,
      status: "active",
      currentPeriodEnd: { $gt: new Date() }
    });

    if (existingSubscription && existingSubscription.planId === planId) {
      return NextResponse.json(
        { error: "User already has this subscription plan" },
        { status: 400 }
      );
    }

    try {
      // Create checkout session with Lemon Squeezy
      const checkoutResult = await lemonSqueezyService.createCheckout({
        variantId: plan.lemonsqueezyVariantId,
        customEmail: user.email,
        customName: `${user.firstName} ${user.lastName}`,
        redirectUrl: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success`,
        customData: {
          userId: userId,
          userEmail: user.email,
          userName: `${user.firstName} ${user.lastName}`,
          upgradeFrom: existingSubscription?.planId || "free"
        }
      });

      if (!checkoutResult.success || !checkoutResult.checkoutUrl) {
        throw new Error(checkoutResult.error || "Failed to create checkout session");
      }

      logger.info("Checkout session created", {
        action: "checkout_session_created",
        metadata: {
          userId,
          planId,
          checkoutUrl: checkoutResult.checkoutUrl.substring(0, 50) + "...", // Log partial URL for privacy
        },
      });

      return NextResponse.json({
        checkoutUrl: checkoutResult.checkoutUrl,
        plan: {
          id: plan.id,
          name: plan.name,
          price: plan.price,
          currency: plan.currency,
          interval: plan.interval,
        },
      });
    } catch (lemonSqueezyError) {
      logger.error("LemonSqueezy checkout creation failed", {
        action: "lemonsqueezy_checkout_failed",
        metadata: {
          userId,
          planId,
          error: lemonSqueezyError instanceof Error ? lemonSqueezyError.message : String(lemonSqueezyError),
        },
      });

      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error("Subscription upgrade error", {
      action: "subscription_upgrade_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });

    if (error instanceof Error && error.message.includes("token")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to process subscription upgrade" },
      { status: 500 }
    );
  }
}

// Get upgrade options for current user
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { userId } = verifyAuth(request);

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentSubscription = await Subscription.findOne({
      userId,
      status: "active",
      currentPeriodEnd: { $gt: new Date() }
    });

    const currentPlan = currentSubscription?.planId || "free";
    const plans = lemonSqueezyService.getPlans();

    // Filter available upgrade options
    const upgradeOptions = plans.filter(plan => {
      if (currentPlan === "free") {
        return true; // Can upgrade to any plan from free
      }
      if (currentPlan === "premium") {
        return plan.id.includes("plus"); // Can only upgrade to plus
      }
      if (currentPlan === "premium_plus") {
        return plan.id.includes("annual") && plan.id.includes("plus"); // Can switch to annual
      }
      return false;
    });

    return NextResponse.json({
      currentPlan,
      currentSubscription: currentSubscription ? {
        planId: currentSubscription.planId,
        status: currentSubscription.status,
        currentPeriodEnd: currentSubscription.currentPeriodEnd,
        cancelAtPeriodEnd: currentSubscription.cancelAtPeriodEnd
      } : null,
      upgradeOptions,
      user: {
        type: user.subscription?.type || "free",
        features: user.subscription?.features || []
      }
    });
  } catch (error) {
    logger.error("Get upgrade options error", {
      action: "get_upgrade_options_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });

    if (error instanceof Error && error.message.includes("token")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Failed to get upgrade options" },
      { status: 500 }
    );
  }
}