// lib/subscriptionManager.ts
import User from "@/models/User";
import Subscription from "@/models/Subscription";
import { logger } from "@/lib/logger";

export class SubscriptionManager {
  /**
   * Get user's current subscription with enhanced features
   */
  static async getUserSubscription(userId: string) {
    try {
      const user = await User.findById(userId);
      if (!user) throw new Error("User not found");

      const activeSubscription = await Subscription.findOne({
        userId,
        status: "active",
        currentPeriodEnd: { $gt: new Date() }
      }).sort({ currentPeriodEnd: -1 });

      return {
        user: {
          type: user.subscription?.type || "free",
          features: user.subscription?.features || [],
          expiresAt: user.subscription?.expiresAt
        },
        lemonsqueezy: activeSubscription ? {
          id: activeSubscription.lemonsqueezySubscriptionId,
          planId: activeSubscription.planId,
          status: activeSubscription.status,
          currentPeriodEnd: activeSubscription.currentPeriodEnd,
          cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd
        } : null
      };
    } catch (error) {
      logger.error("Error getting user subscription", {
        action: "get_user_subscription_failed",
        metadata: { userId, error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Check if user can access a specific feature
   */
  static async canAccessFeature(userId: string, feature: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);
      return subscription.user.features.includes(feature);
    } catch {
      return false; // Default to no access if error
    }
  }

  /**
   * Get usage limits for user based on subscription
   */
  static async getUserLimits(userId: string) {
    const limits = {
      free: {
        dailyLikes: 5,
        superLikes: 1,
        boosts: 0,
        canSeeWhoLiked: false,
        canUseIncognito: false,
        canUseTravelMode: false,
        canMessageBeforeMatch: false
      },
      premium: {
        dailyLikes: -1, // unlimited
        superLikes: 5,
        boosts: 1,
        canSeeWhoLiked: true,
        canUseIncognito: false,
        canUseTravelMode: false,
        canMessageBeforeMatch: false
      },
      premium_plus: {
        dailyLikes: -1, // unlimited
        superLikes: -1, // unlimited
        boosts: -1, // unlimited
        canSeeWhoLiked: true,
        canUseIncognito: true,
        canUseTravelMode: true,
        canMessageBeforeMatch: true
      }
    };

    try {
      const subscription = await this.getUserSubscription(userId);
      const subscriptionType = subscription.user.type;

      return limits[subscriptionType as keyof typeof limits] || limits.free;
    } catch (error) {
      logger.error("Error getting user limits", {
        action: "get_user_limits_failed",
        metadata: { userId, error: error instanceof Error ? error.message : String(error) }
      });
      return limits.free; // Default to free limits
    }
  }

  /**
   * Sync subscription between User model and Subscription model
   */
  static async syncUserSubscription(userId: string) {
    try {
      const activeSubscription = await Subscription.findOne({
        userId,
        status: "active",
        currentPeriodEnd: { $gt: new Date() }
      }).sort({ currentPeriodEnd: -1 });

      const user = await User.findById(userId);
      if (!user) throw new Error("User not found");

      if (activeSubscription) {
        // Update user model based on active subscription
        const planFeatures = this.getPlanFeatures(activeSubscription.planId);
        
        user.subscription = {
          type: activeSubscription.planId.includes("plus") ? "premium_plus" : 
                activeSubscription.planId.includes("premium") ? "premium" : "free",
          expiresAt: activeSubscription.currentPeriodEnd,
          features: planFeatures
        };
      } else {
        // No active subscription, set to free
        user.subscription = {
          type: "free",
          features: []
        };
      }

      await user.save();
      return user.subscription;
    } catch (error) {
      logger.error("Error syncing user subscription", {
        action: "sync_user_subscription_failed",
        metadata: { userId, error: error instanceof Error ? error.message : String(error) }
      });
      throw error;
    }
  }

  /**
   * Get features for a specific plan
   */
  private static getPlanFeatures(planId: string): string[] {
    const planFeatures = {
      premium: [
        "seeWhoLikedYou",
        "unlimitedLikes",
        "superLikes",
        "boosts",
        "readReceipts",
        "profileControl",
        "advancedFilters",
        "undoSwipe",
        "adFree"
      ],
      premium_plus: [
        "seeWhoLikedYou",
        "unlimitedLikes",
        "superLikes",
        "boosts",
        "travelMode",
        "readReceipts",
        "incognitoMode",
        "prioritySupport",
        "profileControl",
        "advancedFilters",
        "messageBeforeMatch",
        "undoSwipe",
        "adFree"
      ]
    };

    if (planId.includes("plus")) return planFeatures.premium_plus;
    if (planId.includes("premium")) return planFeatures.premium;
    return [];
  }
}