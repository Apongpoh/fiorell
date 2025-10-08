import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyAuth } from "@/lib/auth";
import CryptoSubscription from "@/models/CryptoSubscription";
import CryptoPayment from "@/models/CryptoPayment";
import Subscription from "@/models/Subscription";
import { getCryptoService } from "@/lib/cryptoService";

// Create crypto subscription
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { userId } = verifyAuth(request);
    const body = await request.json();
    
    const {
      cryptocurrency,
      planType,
      billingCycle,
      autoRenew = true,
    } = body;
    
    // Validate input
    if (!["bitcoin", "monero"].includes(cryptocurrency)) {
      return NextResponse.json(
        { error: "Invalid cryptocurrency" },
        { status: 400 }
      );
    }
    
    if (!["premium", "premium_plus"].includes(planType)) {
      return NextResponse.json(
        { error: "Invalid plan type" },
        { status: 400 }
      );
    }
    
    if (!["monthly", "annual"].includes(billingCycle)) {
      return NextResponse.json(
        { error: "Invalid billing cycle" },
        { status: 400 }
      );
    }
    
    // Check if user already has an active crypto subscription
    const existingSubscription = await CryptoSubscription.findOne({
      userId,
      status: { $in: ["active", "pending"] },
    });
    
    if (existingSubscription) {
      return NextResponse.json(
        { error: "User already has an active crypto subscription" },
        { status: 400 }
      );
    }
    
    // Get pricing
    const cryptoService = getCryptoService();
    
    const planPricing: Record<string, Record<string, number>> = {
      premium: {
        monthly: 9.99,
        annual: 99.99,
      },
      premium_plus: {
        monthly: 19.99,
        annual: 199.99,
      },
    };
    
    const amountUSD = planPricing[planType]?.[billingCycle] || 9.99;
    const amountCrypto = await cryptoService.convertUSDToCrypto(amountUSD, cryptocurrency);
    
    // Generate payment address
    const paymentAddress = await cryptoService.generateAddress(cryptocurrency);
    
    // Calculate subscription periods
    const now = new Date();
    const nextBilling = new Date(now);
    const periodEnd = new Date(now);
    
    if (billingCycle === "monthly") {
      nextBilling.setMonth(nextBilling.getMonth() + 1);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      nextBilling.setFullYear(nextBilling.getFullYear() + 1);
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }
    
    // Create crypto subscription
    const cryptoSubscription = new CryptoSubscription({
      userId,
      planType,
      planDuration: billingCycle,
      cryptocurrency,
      network: process.env.CRYPTO_NETWORK || "testnet",
      amountCrypto,
      amountUSD,
      billingCycle,
      nextBillingDate: nextBilling,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      paymentAddress,
      autoRenew,
      status: "pending",
    });
    
    await cryptoSubscription.save();
    
    return NextResponse.json({
      subscription: {
        id: cryptoSubscription._id,
        cryptocurrency,
        planType,
        billingCycle,
        amountCrypto,
        amountUSD,
        paymentAddress,
        nextBillingDate: nextBilling,
        currentPeriodEnd: periodEnd,
        status: cryptoSubscription.status,
        autoRenew,
      },
    });
    
  } catch (error) {
    console.error("Create crypto subscription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get user's crypto subscriptions
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { userId } = verifyAuth(request);
    
    const subscriptions = await CryptoSubscription.find({ userId })
      .sort({ createdAt: -1 });
    
    const subscriptionsWithPayments = await Promise.all(
      subscriptions.map(async (sub) => {
        const recentPayments = await CryptoPayment.find({
          userId,
          cryptocurrency: sub.cryptocurrency,
          planType: sub.planType,
        })
          .sort({ createdAt: -1 })
          .limit(5);
        
        return {
          id: sub._id,
          cryptocurrency: sub.cryptocurrency,
          planType: sub.planType,
          billingCycle: sub.billingCycle,
          status: sub.status,
          amountCrypto: sub.amountCrypto,
          amountUSD: sub.amountUSD,
          paymentAddress: sub.paymentAddress,
          nextBillingDate: sub.nextBillingDate,
          currentPeriodStart: sub.currentPeriodStart,
          currentPeriodEnd: sub.currentPeriodEnd,
          autoRenew: sub.autoRenew,
          totalPayments: sub.totalPayments,
          successfulPayments: sub.successfulPayments,
          failedPayments: sub.failedPayments,
          health: sub.health,
          recentPayments: recentPayments.map(p => ({
            paymentId: p.paymentId,
            status: p.status,
            amount: p.amount,
            confirmations: p.confirmations,
            createdAt: p.createdAt,
          })),
          createdAt: sub.createdAt,
        };
      })
    );
    
    return NextResponse.json({ subscriptions: subscriptionsWithPayments });
    
  } catch (error) {
    console.error("Get crypto subscriptions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Update crypto subscription
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { userId } = verifyAuth(request);
    const body = await request.json();
    
    const { subscriptionId, autoRenew, cancelAtPeriodEnd } = body;
    
    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Subscription ID is required" },
        { status: 400 }
      );
    }
    
    const subscription = await CryptoSubscription.findOne({
      _id: subscriptionId,
      userId,
    });
    
    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }
    
    // Update subscription settings
    if (typeof autoRenew === "boolean") {
      subscription.autoRenew = autoRenew;
    }
    
    if (typeof cancelAtPeriodEnd === "boolean") {
      subscription.cancelAtPeriodEnd = cancelAtPeriodEnd;
      
      if (cancelAtPeriodEnd) {
        subscription.cancelledAt = new Date();
        subscription.cancellationReason = "User requested cancellation";
      } else {
        subscription.cancelledAt = undefined;
        subscription.cancellationReason = undefined;
      }
    }
    
    await subscription.save();
    
    return NextResponse.json({
      subscription: {
        id: subscription._id,
        autoRenew: subscription.autoRenew,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        cancelledAt: subscription.cancelledAt,
        status: subscription.status,
      },
    });
    
  } catch (error) {
    console.error("Update crypto subscription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Cancel crypto subscription
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { userId } = verifyAuth(request);
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get("subscriptionId");
    const immediate = searchParams.get("immediate") === "true";
    
    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Subscription ID is required" },
        { status: 400 }
      );
    }
    
    const subscription = await CryptoSubscription.findOne({
      _id: subscriptionId,
      userId,
    });
    
    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }
    
    if (immediate) {
      // Cancel immediately
      subscription.status = "cancelled";
      subscription.cancelledAt = new Date();
      subscription.cancellationReason = "User requested immediate cancellation";
      subscription.autoRenew = false;
      
      // Also cancel the regular subscription if it exists
      await Subscription.updateOne(
        { userId },
        {
          status: "cancelled",
          cancelledAt: new Date(),
        }
      );
    } else {
      // Cancel at period end
      subscription.cancelAtPeriodEnd = true;
      subscription.cancelledAt = new Date();
      subscription.cancellationReason = "User requested cancellation at period end";
      subscription.autoRenew = false;
    }
    
    await subscription.save();
    
    return NextResponse.json({
      message: immediate 
        ? "Subscription cancelled immediately"
        : "Subscription will be cancelled at the end of the current period",
      subscription: {
        id: subscription._id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        cancelledAt: subscription.cancelledAt,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    });
    
  } catch (error) {
    console.error("Cancel crypto subscription error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}