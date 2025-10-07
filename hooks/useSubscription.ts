import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/api";

export interface SubscriptionInfo {
  hasPremium: boolean;
  hasPremiumPlus: boolean;
  isActive: boolean;
  planId?: string;
  planName?: string;
  features: string[];
  daysRemaining?: number;
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

export interface SubscriptionData {
  subscription: SubscriptionInfo;
  limits: FeatureLimits;
  usage: DailyUsage;
  status: string;
}

export function useSubscription() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiRequest("/user/subscription");
      setData(response as SubscriptionData);
    } catch (err: unknown) {
      console.error("Error fetching subscription:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch subscription data"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const checkFeatureAccess = useCallback(
    (feature: keyof FeatureLimits): boolean => {
      if (!data) return false;
      return data.limits[feature] as boolean;
    },
    [data]
  );

  const checkDailyLimit = useCallback(
    (
      action: "likes" | "superLikes" | "boosts"
    ): {
      canUse: boolean;
      current: number;
      limit: number;
      remaining: number;
    } => {
      if (!data) {
        return { canUse: false, current: 0, limit: 0, remaining: 0 };
      }

      const current = data.usage[action];
      const limitKey =
        action === "likes"
          ? "dailyLikes"
          : action === "superLikes"
          ? "dailySuperLikes"
          : "dailyBoosts";
      const limit = data.limits[limitKey];

      // -1 means unlimited
      if (limit === -1) {
        return { canUse: true, current, limit, remaining: -1 };
      }

      const remaining = Math.max(0, limit - current);
      const canUse = current < limit;

      return { canUse, current, limit, remaining };
    },
    [data]
  );

  const hasFeature = useCallback(
    (feature: string): boolean => {
      if (!data?.subscription.features) return false;
      return data.subscription.features.some((f) =>
        f.toLowerCase().includes(feature.toLowerCase())
      );
    },
    [data]
  );

  const isPremium = data?.subscription.hasPremium || false;
  const isPremiumPlus = data?.subscription.hasPremiumPlus || false;
  const isActive = data?.subscription.isActive || false;

  return {
    // Data
    subscription: data?.subscription || null,
    limits: data?.limits || null,
    usage: data?.usage || null,

    // Status
    loading,
    error,
    isPremium,
    isPremiumPlus,
    isActive,

    // Methods
    refetch: fetchSubscription,
    checkFeatureAccess,
    checkDailyLimit,
    hasFeature,

    // Convenience getters
    canSeeWhoLikedYou: data?.limits.canSeeWhoLikedYou || false,
    canUseAdvancedFilters: data?.limits.canUseAdvancedFilters || false,
    canUseIncognitoMode: data?.limits.canUseIncognitoMode || false,
    canMessageBeforeMatching: data?.limits.canMessageBeforeMatching || false,
    canUseTravelMode: data?.limits.canUseTravelMode || false,
    hasReadReceipts: data?.limits.hasReadReceipts || false,
    hasAdFreeExperience: data?.limits.hasAdFreeExperience || false,
  };
}

// Hook for checking specific feature restrictions
export function useFeatureRestriction(feature: string) {
  const { checkFeatureAccess, isPremium, isPremiumPlus, loading } =
    useSubscription();

  const isRestricted = !checkFeatureAccess(feature as keyof FeatureLimits);
  const requiresPremium = ["see_who_liked", "advanced_filters"].includes(
    feature
  );
  const requiresPremiumPlus = [
    "incognito",
    "message_before_match",
    "travel_mode",
  ].includes(feature);

  return {
    isRestricted,
    requiresPremium: requiresPremium && !isPremium,
    requiresPremiumPlus: requiresPremiumPlus && !isPremiumPlus,
    loading,
    upgradeMessage: requiresPremiumPlus
      ? "This feature requires Premium Plus. Upgrade to unlock!"
      : "This feature requires Premium. Upgrade to enhance your experience!",
  };
}

// Hook for daily usage limits
export function useDailyLimits() {
  const { checkDailyLimit, refetch } = useSubscription();

  const likesLimit = checkDailyLimit("likes");
  const superLikesLimit = checkDailyLimit("superLikes");
  const boostsLimit = checkDailyLimit("boosts");

  return {
    likes: likesLimit,
    superLikes: superLikesLimit,
    boosts: boostsLimit,
    refetch, // Call this after performing actions to update counts
  };
}
