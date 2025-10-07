import { Types } from 'mongoose';
import Subscription from '@/models/Subscription';

export interface UserSubscriptionInfo {
  hasPremium: boolean;
  hasPremiumPlus: boolean;
  isActive: boolean;
  planId?: string;
  planName?: string;
  features: string[];
  daysRemaining?: number;
  subscription?: unknown;
}

export interface FeatureLimits {
  dailyLikes: number;
  dailySuperLikes: number;
  dailyBoosts: number;
  canSeeWhoLikedYou: boolean;
  canUseAdvancedFilters: boolean;
  canUseIncognitoMode: boolean;
  canMessageBeforeMatching: boolean;
  canUseTravelMode: boolean;
  hasReadReceipts: boolean;
  hasPrioritySupport: boolean;
  hasAdFreeExperience: boolean;
  profileBoostsPerWeek: number;
}

export interface DailyUsage {
  likes: number;
  superLikes: number;
  boosts: number;
}

// Default limits for free users - generous to allow exploration
export const FREE_USER_LIMITS: FeatureLimits = {
  dailyLikes: 25, // Reduced but still enough to explore
  dailySuperLikes: 1,
  dailyBoosts: 1, // Allow one boost per day for free users
  canSeeWhoLikedYou: false,
  canUseAdvancedFilters: false, // Advanced filters require premium
  canUseIncognitoMode: false,
  canMessageBeforeMatching: false,
  canUseTravelMode: false,
  hasReadReceipts: false,
  hasPrioritySupport: false,
  hasAdFreeExperience: false,
  profileBoostsPerWeek: 3, // 3 boosts per week for free users
};

// Premium user limits
export const PREMIUM_USER_LIMITS: FeatureLimits = {
  dailyLikes: -1, // Unlimited
  dailySuperLikes: 5,
  dailyBoosts: 5,
  canSeeWhoLikedYou: true,
  canUseAdvancedFilters: true,
  canUseIncognitoMode: false,
  canMessageBeforeMatching: false,
  canUseTravelMode: false,
  hasReadReceipts: true,
  hasPrioritySupport: true,
  hasAdFreeExperience: true,
  profileBoostsPerWeek: 3,
};

// Premium Plus user limits
export const PREMIUM_PLUS_USER_LIMITS: FeatureLimits = {
  dailyLikes: -1, // Unlimited
  dailySuperLikes: -1, // Unlimited
  dailyBoosts: -1, // Unlimited
  canSeeWhoLikedYou: true,
  canUseAdvancedFilters: true,
  canUseIncognitoMode: true,
  canMessageBeforeMatching: true,
  canUseTravelMode: true,
  hasReadReceipts: true,
  hasPrioritySupport: true,
  hasAdFreeExperience: true,
  profileBoostsPerWeek: -1, // Unlimited
};

/**
 * Get user's subscription information
 */
export async function getUserSubscription(userId: string | Types.ObjectId): Promise<UserSubscriptionInfo> {
  try {
    // Get user's current subscription
    const subscription = await Subscription.findOne({
      userId: userId,
      status: { $in: ['active', 'on_trial'] },
      currentPeriodEnd: { $gt: new Date() }
    }).lean() as {
      planId: string;
      currentPeriodEnd: Date;
      [key: string]: unknown;
    } | null;

    if (!subscription) {
      return {
        hasPremium: false,
        hasPremiumPlus: false,
        isActive: false,
        features: [],
      };
    }

    const isPremium = ['premium', 'premium_annual'].includes(subscription.planId);
    const isPremiumPlus = ['premium_plus', 'premium_plus_annual'].includes(subscription.planId);

    const features = getSubscriptionFeatures(subscription.planId);
    const daysRemaining = Math.ceil(
      (subscription.currentPeriodEnd.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      hasPremium: isPremium || isPremiumPlus,
      hasPremiumPlus: isPremiumPlus,
      isActive: true,
      planId: subscription.planId,
      planName: getPlanDisplayName(subscription.planId),
      features,
      daysRemaining,
      subscription,
    };
  } catch (error) {
    console.error('Error getting user subscription:', error);
    return {
      hasPremium: false,
      hasPremiumPlus: false,
      isActive: false,
      features: [],
    };
  }
}

/**
 * Get feature limits based on user's subscription
 */
export async function getUserFeatureLimits(userId: string | Types.ObjectId): Promise<FeatureLimits> {
  const subscriptionInfo = await getUserSubscription(userId);

  if (subscriptionInfo.hasPremiumPlus) {
    return PREMIUM_PLUS_USER_LIMITS;
  }

  if (subscriptionInfo.hasPremium) {
    return PREMIUM_USER_LIMITS;
  }

  return FREE_USER_LIMITS;
}

// Check if user is in grace period (first 7 days)
export async function isUserInGracePeriod(userId: string): Promise<boolean> {
  try {
    const User = (await import('@/models/User')).default;
    const user = await User.findById(userId);
    if (!user) return false;
    
    const accountAge = Date.now() - user.createdAt.getTime();
    const gracePeriodDays = 7; // 7 days grace period
    const gracePeriodMs = gracePeriodDays * 24 * 60 * 60 * 1000;
    
    return accountAge < gracePeriodMs;
  } catch (error) {
    console.error('Error checking grace period:', error);
    return false;
  }
}

// Get enhanced limits for new users in grace period
export function getGracePeriodLimits(): FeatureLimits {
  return {
    ...FREE_USER_LIMITS,
    dailyLikes: 50, // Extra likes during grace period
    dailySuperLikes: 3, // Extra super likes
    dailyBoosts: 2, // Extra boosts
    canUseAdvancedFilters: true, // Allow advanced filters during grace period
    profileBoostsPerWeek: 7, // Extra boosts per week
  };
}

/**
 * Check if user can perform a specific action
 */
export async function canUserPerformAction(
  userId: string,
  action: string,
  skipUsageCheck: boolean = false
): Promise<{ allowed: boolean; reason?: string; usage?: DailyUsage }> {
  try {
    const subscriptionInfo = await getUserSubscription(userId);
    const isInGracePeriod = await isUserInGracePeriod(userId);
    
    // Determine user limits based on subscription and grace period
    let userLimits: FeatureLimits;
    if (subscriptionInfo.hasPremiumPlus) {
      userLimits = PREMIUM_PLUS_USER_LIMITS;
    } else if (subscriptionInfo.hasPremium) {
      userLimits = PREMIUM_USER_LIMITS;
    } else if (isInGracePeriod) {
      userLimits = getGracePeriodLimits();
    } else {
      userLimits = FREE_USER_LIMITS;
    }

    // Check feature-specific permissions
    switch (action) {
      case 'like':
        if (!skipUsageCheck) {
          const usage = await getUserDailyUsage(userId);
          if (userLimits.dailyLikes !== -1 && usage.likes >= userLimits.dailyLikes) {
            return {
              allowed: false,
              reason: isInGracePeriod 
                ? 'You\'ve reached your daily like limit. Upgrade to Premium for unlimited likes!'
                : subscriptionInfo.hasPremium || subscriptionInfo.hasPremiumPlus
                ? 'Daily limit reached'
                : 'Daily limit reached. Upgrade to Premium for unlimited likes!',
              usage
            };
          }
          return { allowed: true, usage };
        }
        return { allowed: true };

      case 'super_like':
        if (!skipUsageCheck) {
          const usage = await getUserDailyUsage(userId);
          if (userLimits.dailySuperLikes !== -1 && usage.superLikes >= userLimits.dailySuperLikes) {
            return {
              allowed: false,
              reason: isInGracePeriod
                ? 'You\'ve used all your super likes today. Upgrade for more!'
                : subscriptionInfo.hasPremium || subscriptionInfo.hasPremiumPlus
                ? 'Daily super like limit reached'
                : 'Daily super like limit reached. Upgrade to Premium for more!',
              usage
            };
          }
          return { allowed: true, usage };
        }
        return { allowed: true };

      case 'advanced_filters':
        if (!userLimits.canUseAdvancedFilters) {
          return {
            allowed: false,
            reason: isInGracePeriod
              ? 'Grace period expired. Upgrade to Premium to continue using advanced filters!'
              : 'Advanced filters are a Premium feature. Upgrade to find your perfect match!'
          };
        }
        return { allowed: true };

      case 'incognito_mode':
        if (!userLimits.canUseIncognitoMode) {
          return {
            allowed: false,
            reason: 'Incognito mode is a Premium Plus feature. Upgrade to browse anonymously!'
          };
        }
        return { allowed: true };

      case 'message_before_matching':
        if (!userLimits.canMessageBeforeMatching) {
          return {
            allowed: false,
            reason: 'Message before matching is a Premium Plus feature. Upgrade to break the ice!'
          };
        }
        return { allowed: true };

      case 'travel_mode':
        if (!userLimits.canUseTravelMode) {
          return {
            allowed: false,
            reason: 'Travel mode is a Premium Plus feature. Upgrade to explore the world!'
          };
        }
        return { allowed: true };

      case 'read_receipts':
        if (!userLimits.hasReadReceipts) {
          return {
            allowed: false,
            reason: 'Read receipts are a Premium Plus feature. Upgrade to see when messages are read!'
          };
        }
        return { allowed: true };

      case 'see_who_liked_you':
        if (!userLimits.canSeeWhoLikedYou) {
          return {
            allowed: false,
            reason: 'See who liked you is a Premium feature. Upgrade to discover your admirers!'
          };
        }
        return { allowed: true };

      case 'profile_boost':
        const usage = await getUserDailyUsage(userId);
        if (userLimits.dailyBoosts !== -1 && usage.boosts >= userLimits.dailyBoosts) {
          return {
            allowed: false,
            reason: isInGracePeriod
              ? 'You\'ve used all your daily boosts. Upgrade for unlimited boosts!'
              : subscriptionInfo.hasPremium || subscriptionInfo.hasPremiumPlus
              ? 'Daily boost limit reached'
              : 'Daily boost limit reached. Upgrade to Premium for more boosts!',
            usage
          };
        }
        return { allowed: true, usage };

      default:
        return { allowed: true };
    }
  } catch (error) {
    console.error('Error checking user permissions:', error);
    return { allowed: false, reason: 'Unable to verify permissions' };
  }
}

/**
 * Get current daily usage for a user
 */
export async function getUserDailyUsage(userId: string | Types.ObjectId): Promise<{
  likes: number;
  superLikes: number;
  boosts: number;
}> {
  try {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    // Import here to avoid circular dependencies
    const Interaction = (await import('@/models/Interaction')).default;
    
    const [likes, superLikes] = await Promise.all([
      Interaction.countDocuments({
        userId: userId,
        action: 'like',
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      }),
      Interaction.countDocuments({
        userId: userId,
        action: 'super_like',
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      }),
    ]);

    // TODO: Add boost tracking model and count
    const boosts = 0;

    return {
      likes,
      superLikes,
      boosts,
    };
  } catch (error) {
    console.error('Error getting user daily usage:', error);
    return {
      likes: 0,
      superLikes: 0,
      boosts: 0,
    };
  }
}

/**
 * Check if user has exceeded their daily limits
 */
export async function checkDailyLimits(userId: string | Types.ObjectId, action: 'like' | 'super_like' | 'boost'): Promise<{
  allowed: boolean;
  reason?: string;
  currentUsage: number;
  limit: number;
  upgradeRequired?: boolean;
}> {
  const [limits, usage] = await Promise.all([
    getUserFeatureLimits(userId),
    getUserDailyUsage(userId),
  ]);

  let currentUsage: number;
  let limit: number;

  switch (action) {
    case 'like':
      currentUsage = usage.likes;
      limit = limits.dailyLikes;
      break;
    case 'super_like':
      currentUsage = usage.superLikes;
      limit = limits.dailySuperLikes;
      break;
    case 'boost':
      currentUsage = usage.boosts;
      limit = limits.dailyBoosts;
      break;
    default:
      return {
        allowed: false,
        reason: 'Unknown action',
        currentUsage: 0,
        limit: 0,
      };
  }

  // -1 means unlimited
  if (limit === -1) {
    return {
      allowed: true,
      currentUsage,
      limit,
    };
  }

  const allowed = currentUsage < limit;
  let reason: string | undefined;
  let upgradeRequired = false;

  if (!allowed) {
    upgradeRequired = true;
    switch (action) {
      case 'like':
        reason = `Daily like limit reached (${limit}). Upgrade to Premium for unlimited likes!`;
        break;
      case 'super_like':
        reason = `Daily super like limit reached (${limit}). Upgrade for more super likes!`;
        break;
      case 'boost':
        reason = limit === 0 
          ? 'Profile boosts are a Premium feature. Upgrade to get daily boosts!'
          : `Daily boost limit reached (${limit}). Upgrade to Premium Plus for unlimited boosts!`;
        break;
    }
  }

  return {
    allowed,
    reason,
    currentUsage,
    limit,
    upgradeRequired,
  };
}

/**
 * Helper function to get subscription features
 */
function getSubscriptionFeatures(planId: string): string[] {
  switch (planId) {
    case 'premium':
    case 'premium_annual':
      return [
        'Unlimited likes',
        'See who liked you',
        '5 Super Boosts per month',
        'Read receipts',
        'Priority customer support',
        'Advanced filters',
      ];
    case 'premium_plus':
    case 'premium_plus_annual':
      return [
        'Everything in Premium',
        'Unlimited Super Boosts',
        'Incognito mode',
        'Message before matching',
        'Travel mode',
        'Profile boost 3x per week',
        'VIP customer support',
      ];
    default:
      return [];
  }
}

/**
 * Helper function to get plan display name
 */
function getPlanDisplayName(planId: string): string {
  switch (planId) {
    case 'premium':
      return 'Premium Monthly';
    case 'premium_annual':
      return 'Premium Annual';
    case 'premium_plus':
      return 'Premium Plus Monthly';
    case 'premium_plus_annual':
      return 'Premium Plus Annual';
    default:
      return 'Unknown Plan';
  }
}

/**
 * Middleware function to check subscription before API actions
 */
export async function requirePremiumFeature(
  userId: string | Types.ObjectId,
  feature: 'see_who_liked' | 'advanced_filters' | 'incognito' | 'message_before_match' | 'travel_mode'
): Promise<{ allowed: boolean; message?: string }> {
  const subscriptionInfo = await getUserSubscription(userId);

  const premiumFeatures = ['see_who_liked', 'advanced_filters'];
  const premiumPlusFeatures = ['incognito', 'message_before_match', 'travel_mode'];

  if (premiumPlusFeatures.includes(feature) && !subscriptionInfo.hasPremiumPlus) {
    return {
      allowed: false,
      message: 'This feature requires Premium Plus. Upgrade to unlock all premium features!'
    };
  }

  if (premiumFeatures.includes(feature) && !subscriptionInfo.hasPremium) {
    return {
      allowed: false,
      message: 'This feature requires Premium. Upgrade to enhance your dating experience!'
    };
  }

  return { allowed: true };
}