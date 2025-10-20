import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyAuth } from "@/lib/auth";
import User from "@/models/User";
import { logger } from "@/lib/logger";

// Static plans data (same as in /api/subscription/plans)
const SUBSCRIPTION_PLANS = [
  {
    id: "premium_monthly",
    name: "Premium",
    description: "Unlock premium features and find more meaningful connections",
    price: 9.99,
    currency: "USD",
    interval: "month" as const,
    popular: false,
  },
  {
    id: "premium_annual",
    name: "Premium",
    description: "Best value - Premium features with annual savings",
    price: 99.99,
    currency: "USD",
    interval: "year" as const,
    popular: true,
  },
  {
    id: "premium_plus_monthly",
    name: "Premium Plus",
    description: "Ultimate dating experience with exclusive features",
    price: 19.99,
    currency: "USD",
    interval: "month" as const,
    popular: false,
  },
  {
    id: "premium_plus_annual",
    name: "Premium Plus",
    description: "Ultimate experience with maximum savings",
    price: 199.99,
    currency: "USD",
    interval: "year" as const,
    popular: false,
  }
];

// Get available plans and user's current subscription

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Check if user is authenticated (optional for GET requests)
    let user = null;
    let userSubscription = null;

    try {
      const { userId } = verifyAuth(request);
      user = await User.findById(userId);

      if (user) {
        userSubscription = {
          type: user.subscription?.type || "free",
          expiresAt: user.subscription?.expiresAt,
          isActive: user.subscription?.isActive || false,
        };
      }
    } catch {
      // User is not authenticated, that's ok for viewing plans
      console.log("User not authenticated, showing public plans");
    }

    // Calculate savings for annual plans
    const plansWithSavings = SUBSCRIPTION_PLANS.map((plan) => {
      if (plan.interval === "year") {
        const monthlyEquivalent = SUBSCRIPTION_PLANS.find(
          (p) =>
            p.id.replace("_annual", "") === plan.id.replace("_annual", "") &&
            p.interval === "month"
        );

        if (monthlyEquivalent) {
          const annualCost = plan.price;
          const monthlyCost = monthlyEquivalent.price * 12;
          const savingsAmount = monthlyCost - annualCost;
          const savingsPercentage = Math.round((savingsAmount / monthlyCost) * 100);
          
          return {
            ...plan,
            savings: {
              savingsAmount,
              savingsPercentage
            },
            monthlyEquivalentPrice: monthlyEquivalent.price,
          };
        }
      }

      return plan;
    });

    return NextResponse.json({
      plans: plansWithSavings,
      userSubscription,
    });
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription plans" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { userId } = verifyAuth(request);
    const { planId } = await request.json();

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

    // Validate plan ID (check against our static plans)
    const validPlanIds = [
      "premium_monthly",
      "premium_annual", 
      "premium_plus_monthly",
      "premium_plus_annual"
    ];
    
    if (!validPlanIds.includes(planId)) {
      return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
    }

    // Check if user already has an active subscription
    if (
      user.subscription?.type !== "free" &&
      user.subscription?.expiresAt &&
      new Date() < user.subscription.expiresAt
    ) {
      return NextResponse.json(
        { error: "User already has an active subscription" },
        { status: 400 }
      );
    }

    // Generate a placeholder checkout session
    // This simulates what LemonSqueezy would return
    const checkoutId = `checkout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Return placeholder checkout URL that goes to our demo checkout page
    const checkoutUrl = `${process.env.NEXT_PUBLIC_APP_URL}/subscription/checkout?session=${checkoutId}&plan=${planId}&user=${userId}`;

    logger.info("Created placeholder checkout session:", {
      action: "create_placeholder_checkout",
      metadata: {
        userId,
        planId,
        checkoutId,
        userEmail: user.email,
      },
    });

    return NextResponse.json({
      checkoutUrl,
      checkoutId,
      isPlaceholder: true, // Flag to indicate this is a demo checkout
    });
  } catch (error) {
    logger.error("Error creating subscription checkout:", {
      action: "create_subscription_checkout_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
