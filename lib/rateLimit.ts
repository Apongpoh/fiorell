import RateLimit from "@/models/RateLimit";

export interface RateLimitConfig {
  resourceType: "message" | "like" | "superlike" | "boost" | "media_upload";
  userId: string;
  resourceId?: string;
  windowMs: number; // Time window in milliseconds
  maxAttempts: number; // Maximum attempts in window
  contentHash?: string; // For duplicate detection
}

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  resetTime: Date;
  isDuplicate?: boolean;
  error?: string;
}

/**
 * Check if an action is rate limited
 */
export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const { resourceType, userId, resourceId, windowMs, maxAttempts, contentHash } = config;
  
  // Create unique identifier
  const identifier = resourceId ? `${userId}:${resourceType}:${resourceId}` : `${userId}:${resourceType}`;
  
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);

  try {
    // Find existing rate limit record
    let rateLimit = await RateLimit.findOne({
      identifier,
      expiresAt: { $gt: now }
    });

    if (!rateLimit) {
      // Create new rate limit record
      rateLimit = new RateLimit({
        userId,
        resourceType,
        resourceId,
        identifier,
        contentHash,
        lastAction: now,
        actionCount: 1,
        windowStart: now,
      });
      
      await rateLimit.save();
      
      return {
        allowed: true,
        remainingAttempts: maxAttempts - 1,
        resetTime: new Date(now.getTime() + windowMs),
      };
    }

    // Check for duplicate content
    if (contentHash && rateLimit.contentHash === contentHash) {
      return {
        allowed: false,
        remainingAttempts: Math.max(0, maxAttempts - rateLimit.actionCount),
        resetTime: new Date(rateLimit.windowStart.getTime() + windowMs),
        isDuplicate: true,
        error: "Duplicate action detected",
      };
    }

    // Check if we're still within the rate limit window
    if (rateLimit.windowStart < windowStart) {
      // Window has expired, reset the counter
      rateLimit.actionCount = 1;
      rateLimit.windowStart = now;
      rateLimit.lastAction = now;
      rateLimit.contentHash = contentHash;
    } else {
      // Within the window, check if we've exceeded the limit
      if (rateLimit.actionCount >= maxAttempts) {
        return {
          allowed: false,
          remainingAttempts: 0,
          resetTime: new Date(rateLimit.windowStart.getTime() + windowMs),
          error: `Rate limit exceeded. Maximum ${maxAttempts} actions per ${Math.round(windowMs / 1000)} seconds.`,
        };
      }

      // Increment the counter
      rateLimit.actionCount += 1;
      rateLimit.lastAction = now;
      rateLimit.contentHash = contentHash;
    }

    await rateLimit.save();

    return {
      allowed: true,
      remainingAttempts: Math.max(0, maxAttempts - rateLimit.actionCount),
      resetTime: new Date(rateLimit.windowStart.getTime() + windowMs),
    };

  } catch (error) {
    console.error("Rate limit check error:", error);
    // In case of error, allow the action but log it
    return {
      allowed: true,
      remainingAttempts: maxAttempts - 1,
      resetTime: new Date(now.getTime() + windowMs),
      error: "Rate limit check failed",
    };
  }
}

/**
 * Reset rate limit for a specific resource
 */
export async function resetRateLimit(
  userId: string,
  resourceType: "message" | "like" | "superlike" | "boost" | "media_upload",
  resourceId?: string
): Promise<boolean> {
  const identifier = resourceId ? `${userId}:${resourceType}:${resourceId}` : `${userId}:${resourceType}`;
  
  try {
    await RateLimit.deleteOne({ identifier });
    return true;
  } catch (error) {
    console.error("Reset rate limit error:", error);
    return false;
  }
}

/**
 * Clean up expired rate limit records (for maintenance)
 */
export async function cleanupExpiredRateLimits(): Promise<number> {
  try {
    const result = await RateLimit.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    return result.deletedCount || 0;
  } catch (error) {
    console.error("Cleanup rate limits error:", error);
    return 0;
  }
}