import User from "@/models/User";
import Subscription from "@/models/Subscription";
import connectToDatabase from "@/lib/mongodb";

export interface ActivationPayment {
  userId: string;
  planType: string;
  planDuration: string;
  cryptocurrency: string;
  isRecurring?: boolean;
}

// Add explicit summary types for the function's return payload.
export interface SubscriptionSummary {
  id: string;
  type: string;
  status: string;
  startDate: Date;
  endDate: Date;
  paymentMethod: string;
  autoRenew: boolean;
}

export interface UserSummary {
  id: string;
  isPremium: boolean;
  premiumSince?: Date | null;
  subscriptionType?: string;
  subscriptionStatus?: string;
  subscriptionEndDate?: Date | null;
}

/**
 * Activate a user's subscription after successful payment
 * Can be called from admin verification, webhook, or manual activation
 */
export async function activateSubscription(payment: ActivationPayment): Promise<{
  success: boolean;
  message: string;
  subscription?: SubscriptionSummary;
  user?: UserSummary;
}> {
  try {
    await connectToDatabase();

    const user = await User.findById(payment.userId);
    if (!user) {
      return {
        success: false,
        message: `User not found for payment`
      };
    }

    // Calculate subscription end date
    const now = new Date();
    const subscriptionEnd = new Date(now);
    
    if (payment.planDuration === "monthly") {
      subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
    } else if (payment.planDuration === "annual") {
      subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
    } else {
      return {
        success: false,
        message: "Invalid plan duration"
      };
    }

    // Create or update subscription record
    let subscription = await Subscription.findOne({ userId: payment.userId });
    
    if (!subscription) {
      subscription = new Subscription({
        userId: payment.userId,
        type: payment.planType,
        status: "active",
        startDate: now,
        endDate: subscriptionEnd,
        paymentMethod: "crypto",
        autoRenew: payment.isRecurring || false,
      });
    } else {
      // Extend existing subscription or upgrade
      subscription.type = payment.planType;
      subscription.status = "active";
      subscription.startDate = now;
      subscription.endDate = subscriptionEnd;
      subscription.paymentMethod = "crypto";
      subscription.autoRenew = payment.isRecurring || false;
    }
    
    await subscription.save();

    // Update user subscription fields
    user.subscriptionType = payment.planType;
    user.subscriptionStatus = "active";
    user.subscriptionEndDate = subscriptionEnd;
    
    // Set premium status
    if (!user.isPremium) {
      user.isPremium = true;
      user.premiumSince = now;
    }

    // Update user subscription object
    if (!user.subscription) {
      user.subscription = {
        plan: payment.planType,
        status: "active",
        startDate: now,
        endDate: subscriptionEnd,
        isRecurring: payment.isRecurring || false,
        paymentMethod: payment.cryptocurrency
      };
    } else {
      user.subscription.plan = payment.planType;
      user.subscription.status = "active";
      user.subscription.startDate = now;
      user.subscription.endDate = subscriptionEnd;
      user.subscription.isRecurring = payment.isRecurring || false;
      user.subscription.paymentMethod = payment.cryptocurrency;
    }

    await user.save();

    console.log(`Subscription activated for user ${user._id}: ${payment.planType} (${payment.planDuration})`);

    return {
      success: true,
      message: `${payment.planType} subscription activated successfully`,
      subscription: {
        id: subscription._id,
        type: subscription.type,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        paymentMethod: subscription.paymentMethod,
        autoRenew: subscription.autoRenew
      },
      user: {
        id: user._id,
        isPremium: user.isPremium,
        premiumSince: user.premiumSince,
        subscriptionType: user.subscriptionType,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionEndDate: user.subscriptionEndDate
      }
    };

  } catch (error) {
    console.error("Error activating subscription:", error);
    return {
      success: false,
      message: "Failed to activate subscription"
    };
  }
}

/**
 * Check if a user has an active subscription
 */
export async function isSubscriptionActive(userId: string): Promise<boolean> {
  try {
    await connectToDatabase();

    const user = await User.findById(userId);
    if (!user) return false;

    // Check if user has active subscription and it hasn't expired
    if (user.subscriptionStatus === "active" && user.subscriptionEndDate) {
      return new Date() < new Date(user.subscriptionEndDate);
    }

    return false;
  } catch (error) {
    console.error("Error checking subscription status:", error);
    return false;
  }
}

/**
 * Get user's current subscription details
 */
export async function getUserSubscription(userId: string) {
  try {
    await connectToDatabase();

    const user = await User.findById(userId);
    const subscription = await Subscription.findOne({ userId });

    if (!user) return null;

    return {
      user: {
        isPremium: user.isPremium,
        premiumSince: user.premiumSince,
        subscriptionType: user.subscriptionType,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionEndDate: user.subscriptionEndDate,
        subscription: user.subscription
      },
      subscription: subscription ? {
        id: subscription._id,
        type: subscription.type,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        paymentMethod: subscription.paymentMethod,
        autoRenew: subscription.autoRenew
      } : null
    };
  } catch (error) {
    console.error("Error getting user subscription:", error);
    return null;
  }
}