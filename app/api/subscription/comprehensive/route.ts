import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import CryptoPayment from "@/models/CryptoPayment";
import { ObjectId } from "mongodb";
import { verifyAuth } from "@/lib/auth";

// Enhanced subscription management API for both crypto and traditional subscriptions
export async function GET(req: NextRequest) {
  try {
    await dbConnect();

    let authResult;
    try {
      authResult = verifyAuth(req);
    } catch {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    const userId = authResult.userId;
    
    if (!ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check for active subscription
    let traditionalSubscription = null;
    let cryptoSubscription = null;

    if (user.subscription?.type !== "free") {
      const isActive = !user.subscription.expiresAt || new Date(user.subscription.expiresAt) > new Date();
      const paymentMethod = user.subscription.paymentMethod || user.subscription.preferredPaymentMethod || "crypto";
      
      if (isActive) {
        const expiresAt = user.subscription.expiresAt;
        const daysRemaining = expiresAt ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 999;
        
        const subscriptionData = {
          planType: user.subscription.type,
          isActive: true,
          expiresAt: expiresAt?.toISOString(),
          daysRemaining,
          features: user.subscription.features || (user.subscription.type === "premium_plus" ? [
            "Unlimited matches",
            "See who liked you", 
            "Advanced filters",
            "Priority support",
            "Read receipts",
            "Message encryption",
            "Priority matching",
            "Advanced analytics"
          ] : [
            "Unlimited matches",
            "See who liked you",
            "Advanced filters", 
            "Priority support",
            "Read receipts"
          ])
        };

        if (paymentMethod === "traditional") {
          traditionalSubscription = {
            id: "traditional",
            planId: user.subscription.type,
            planName: user.subscription.type === "premium_plus" ? "Premium Plus" : "Premium",
            status: "active",
            currentPeriodStart: user.subscription.startDate?.toISOString() || new Date().toISOString(),
            currentPeriodEnd: expiresAt?.toISOString() || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            cancelAtPeriodEnd: false,
            price: user.subscription.type === "premium_plus" ? 19.99 : 9.99,
            currency: "USD",
            interval: "month",
            isActive: true,
            isInTrial: false,
            daysRemaining,
            features: subscriptionData.features,
            paymentMethod: "traditional"
          };
        } else {
          // For crypto subscriptions, try to get duration from the latest payment
          const latestCryptoPayment = await CryptoPayment.findOne({
            userId: userId,
            status: "confirmed"
          }).sort({ confirmedAt: -1, createdAt: -1 });
          
          let planDuration = "1_month"; // default
          if (latestCryptoPayment?.planDuration) {
            planDuration = latestCryptoPayment.planDuration === "annual" ? "1_year" : "1_month";
          } else if (expiresAt) {
            // For manual activations, calculate duration from expiration date
            const now = new Date();
            const expiration = new Date(expiresAt);
            
            // Calculate the difference in days
            const diffInDays = Math.ceil((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            // More comprehensive duration detection based on actual days
            if (diffInDays >= 335) {
              // 11+ months = yearly
              planDuration = "1_year";
            } else if (diffInDays >= 300) {
              // 10 months = close to yearly
              planDuration = "1_year";
            } else if (diffInDays >= 150) {
              // 5-10 months = treat as 6 months or yearly depending on proximity
              planDuration = diffInDays >= 270 ? "1_year" : "6_months";
            } else if (diffInDays >= 75) {
              // 2.5-5 months = 3 months
              planDuration = "3_months";
            } else if (diffInDays >= 35) {
              // 1-2.5 months = monthly
              planDuration = "1_month";
            } else if (diffInDays >= 7) {
              // 1 week to 1 month = monthly
              planDuration = "1_month";
            } else {
              // Less than a week = weekly or custom short duration
              planDuration = "1_week";
            }
          }
          
          cryptoSubscription = {
            isActive: true,
            planType: user.subscription.type,
            planDuration: planDuration,
            startDate: user.subscription.startDate?.toISOString() || new Date().toISOString(),
            expiresAt: expiresAt?.toISOString(),
            daysRemaining,
            features: subscriptionData.features,
            paymentMethod: "crypto",
            preferredCrypto: user.subscription.preferredPaymentMethod === "crypto" ? "bitcoin" : "bitcoin"
          };
        }
      }
    }

    // Get payment history
    const paymentHistory = await CryptoPayment.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const formattedPaymentHistory = paymentHistory.map(payment => ({
      paymentId: (payment._id as ObjectId).toString(),
      paymentReference: payment.paymentReference,
      cryptocurrency: payment.cryptocurrency,
      amount: payment.amount,
      amountUSD: payment.amountUSD,
      status: payment.status,
      statusDisplay: payment.status.charAt(0).toUpperCase() + payment.status.slice(1).replace(/_/g, ' '),
      planType: payment.planType,
      planDuration: payment.planDuration,
      createdAt: payment.createdAt?.toISOString(),
      confirmedAt: payment.confirmedAt?.toISOString(),
      expiresAt: payment.expiresAt?.toISOString()
    }));

    // Determine which subscription is active
    let subscriptionType = null;
    let hasSubscription = false;

    if (traditionalSubscription?.isActive) {
      subscriptionType = "traditional";
      hasSubscription = true;
    } else if (cryptoSubscription?.isActive) {
      subscriptionType = "crypto";
      hasSubscription = true;
    }

    return NextResponse.json({
      hasSubscription,
      subscriptionType,
      traditionalSubscription,
      cryptoSubscription,
      paymentHistory: formattedPaymentHistory,
      user: {
        id: user._id.toString(),
        email: user.email,
        isVerified: user.isVerified
      }
    });

  } catch (error) {
    console.error("Error in comprehensive subscription management:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle subscription modifications
export async function POST(req: NextRequest) {
  try {
    await dbConnect();

    let authResult;
    try {
      authResult = verifyAuth(req);
    } catch {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    const userId = authResult.userId;
    
    if (!ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    const { action, data } = await req.json();

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    switch (action) {
      case "switch_to_crypto":
        // Handle switching from traditional to crypto
        if (user.subscription?.type !== "free" && user.subscription?.paymentMethod === "traditional") {
          // Mark for crypto preference
          user.subscription.preferredPaymentMethod = "crypto";
          // Note: User will need to make a new crypto payment to continue
        }
        await user.save();
        
        return NextResponse.json({
          success: true,
          message: "Payment preference updated to crypto. Make a new crypto payment to continue your subscription."
        });

      case "switch_to_traditional":
        // Handle switching from crypto to traditional
        if (user.subscription?.type !== "free" && user.subscription?.paymentMethod === "crypto") {
          user.subscription.preferredPaymentMethod = "traditional";
          return NextResponse.json({
            success: true,
            message: "Payment preference updated. Crypto subscription will remain active until expiry.",
            cryptoExpiresAt: user.subscription.expiresAt
          });
        }
        
        return NextResponse.json({
          success: true,
          message: "Ready to set up traditional payment method."
        });

      case "extend_crypto":
        // Handle crypto subscription extension
        if (!data?.months || !Number.isInteger(data.months) || data.months < 1) {
          return NextResponse.json(
            { error: "Invalid extension period" },
            { status: 400 }
          );
        }

        if (user.subscription?.type !== "free" && user.subscription?.paymentMethod === "crypto") {
          const currentExpiry = user.subscription.expiresAt ? new Date(user.subscription.expiresAt) : new Date();
          const newExpiry = new Date(currentExpiry.getTime() + (data.months * 30 * 24 * 60 * 60 * 1000));
          
          user.subscription.expiresAt = newExpiry;
          
          await user.save();
          
          return NextResponse.json({
            success: true,
            message: `Crypto subscription extended by ${data.months} month(s)`,
            newExpiryDate: newExpiry.toISOString()
          });
        }
        
        return NextResponse.json(
          { error: "No active crypto subscription to extend" },
          { status: 400 }
        );

      case "update_preferences":
        // Update subscription preferences
        if (data?.preferredCrypto && ["bitcoin", "monero"].includes(data.preferredCrypto)) {
          if (user.subscription) {
            user.subscription.preferredPaymentMethod = "crypto";
          }
          await user.save();
          
          return NextResponse.json({
            success: true,
            message: "Cryptocurrency preference updated"
          });
        }
        
        return NextResponse.json(
          { error: "Invalid preference data" },
          { status: 400 }
        );

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error("Error in subscription modification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handle subscription cancellation
export async function DELETE(req: NextRequest) {
  try {
    await dbConnect();

    let authResult;
    try {
      authResult = verifyAuth(req);
    } catch {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    const userId = authResult.userId;
    
    if (!ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Handle subscription cancellation based on payment method
    if (user.subscription?.type !== "free") {
      const paymentMethod = user.subscription.paymentMethod || "traditional";
      
      if (paymentMethod === "traditional") {
        // For traditional subscriptions, mark for cancellation at period end
        // In a real app, you'd also call Lemon Squeezy API here
        user.subscription.type = "free";
        user.subscription.expiresAt = new Date(); // Immediate cancellation for now
        user.subscription.features = [];
        
        await user.save();
        
        return NextResponse.json({
          success: true,
          message: "Traditional subscription cancelled"
        });
      } else {
        // Handle crypto subscription - immediate cancellation
        user.subscription.type = "free";
        user.subscription.expiresAt = new Date();
        user.subscription.features = [];
        
        await user.save();
        
        return NextResponse.json({
          success: true,
          message: "Crypto subscription cancelled immediately"
        });
      }
    }

    return NextResponse.json(
      { error: "No active subscription to cancel" },
      { status: 400 }
    );

  } catch (error) {
    console.error("Error cancelling subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}