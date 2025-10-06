import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import lemonSqueezyService from "@/lib/lemonSqueezy";
import { verifyAuth } from "@/lib/auth";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { userId } = verifyAuth(request);

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get available plans
    const plans = lemonSqueezyService.getPlans();

    // Add savings calculations for annual plans
    const plansWithSavings = plans.map(plan => {
      if (plan.interval === 'year') {
        const monthlyEquivalent = plans.find(p => 
          p.id.replace('_annual', '') === plan.id.replace('_annual', '') && 
          p.interval === 'month'
        );
        
        if (monthlyEquivalent) {
          const savings = lemonSqueezyService.calculateAnnualSavings(
            monthlyEquivalent.price, 
            plan.price
          );
          return {
            ...plan,
            savings,
            monthlyEquivalentPrice: monthlyEquivalent.price,
          };
        }
      }
      
      return plan;
    });

    return NextResponse.json({
      plans: plansWithSavings,
      userSubscription: user.subscription,
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
      return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
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
    if (user.subscription?.type !== "free" && user.subscription?.expiresAt && new Date() < user.subscription.expiresAt) {
      return NextResponse.json(
        { error: "User already has an active subscription" },
        { status: 400 }
      );
    }

    // Create checkout session
    const checkout = await lemonSqueezyService.createCheckout({
      variantId: plan.lemonsqueezyVariantId,
      customEmail: user.email,
      customName: `${user.firstName} ${user.lastName}`,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success?session_id={checkout_id}`,
      customData: {
        userId: userId,
        planId: planId,
        userEmail: user.email,
      },
    });

    if (!checkout.success) {
      return NextResponse.json(
        { error: checkout.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      checkoutUrl: checkout.checkoutUrl,
      checkoutId: checkout.checkoutId,
    });

  } catch (error) {
    console.error("Error creating subscription checkout:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}