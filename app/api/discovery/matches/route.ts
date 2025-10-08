import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Block from "@/models/Block";
import Interaction from "@/models/Interaction";
import Match from "@/models/Match";
import { verifyAuth } from "@/lib/auth";
import { canUserPerformAction } from "@/lib/subscription";
import { Types } from "mongoose";

// Get potential matches for discovery
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Ensure geospatial index exists on GeoJSON location field
    try {
      await User.collection.createIndex({ location: "2dsphere" });
    } catch {
      // Ignore if index already exists or cannot be created due to permissions
    }

    // Verify authentication
    const { userId } = verifyAuth(request);

    // Get current user to access their preferences
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0"));
    const minAge = searchParams.get("minAge");
    const maxAge = searchParams.get("maxAge");
    const gender = searchParams.get("gender");
    const verifiedOnly = searchParams.get("verifiedOnly") === "true";
    const interestsParam = searchParams.get("interests");
    const maxDistance = searchParams.get("maxDistance");
    const diagnostics = searchParams.get("diag") === "1";

    // Check if advanced filters are being used
    const usingAdvancedFilters = Boolean(
      (gender && gender !== "all") || verifiedOnly || interestsParam
    );

    let advancedFiltersAvailable = true;
    let gracePeriodMessage = null;

    if (usingAdvancedFilters) {
      try {
        const canUseAdvancedFilters = await canUserPerformAction(
          userId,
          "advanced_filters"
        );
        if (!canUseAdvancedFilters.allowed) {
          advancedFiltersAvailable = false;
          gracePeriodMessage = canUseAdvancedFilters.reason;
          // Don't block the request, just ignore advanced filters and continue with basic discovery
        }
      } catch {
        // Fall back to no advanced filters on subscription check error
        advancedFiltersAvailable = false;
      }
    }

    // Build filter based on user preferences
    const filter: {
      [key: string]: unknown;
      $or?: Array<Record<string, unknown>>;
    } = {
      _id: { $ne: new Types.ObjectId(userId) },
      isActive: true,
    };

    // Always allow basic filters (age and distance)
    // Filter by age range
    const ageRange = {
      min: minAge ? parseInt(minAge) : currentUser.preferences?.ageRange?.min,
      max: maxAge ? parseInt(maxAge) : currentUser.preferences?.ageRange?.max,
    };
    
    // Validate age range values
    if (ageRange.min && ageRange.max && !isNaN(ageRange.min) && !isNaN(ageRange.max)) {
      const currentYear = new Date().getFullYear();
      const minBirthYear = currentYear - ageRange.max; // older
      const maxBirthYear = currentYear - ageRange.min; // younger
      filter.dateOfBirth = {
        $gte: new Date(minBirthYear, 0, 1),
        $lte: new Date(maxBirthYear, 11, 31),
      };
    }

    // Only apply advanced filters if user has access
    if (advancedFiltersAvailable) {
      // Filter by gender (advanced)
      const effectiveGender =
        gender && gender !== "all"
          ? gender
          : currentUser.preferences?.genderPreference &&
            currentUser.preferences.genderPreference !== "all"
          ? currentUser.preferences.genderPreference
          : null;
      if (effectiveGender) {
        filter.gender = effectiveGender;
      }

      // Verified only (advanced)
      if (verifiedOnly) {
        filter["verification.isVerified"] = true;
      }

      // Interest-based filtering (advanced)
      if (interestsParam) {
        const searchInterests = interestsParam
          .split(",")
          .map((i) => i.trim().toLowerCase())
          .filter(Boolean);
        if (searchInterests.length > 0) {
          filter.interests = {
            $in: searchInterests.map((interest) => new RegExp(interest, "i")),
          };
        }
      }
    } else {
      // Use basic gender preference from user profile for free users
      const basicGender =
        currentUser.preferences?.genderPreference &&
        currentUser.preferences.genderPreference !== "all"
          ? currentUser.preferences.genderPreference
          : null;
      if (basicGender) {
        filter.gender = basicGender;
      }
    }

    // Apply user deal breakers (server-side hard constraints)
    const dealBreakers = currentUser.preferences?.dealBreakers;
    if (dealBreakers) {
      // Require verified profiles only
      if (dealBreakers.requireVerified) {
        filter["verification.isVerified"] = true;
      }
      // Candidate must include ALL of mustHaveInterests
      if (
        Array.isArray(dealBreakers.mustHaveInterests) &&
        dealBreakers.mustHaveInterests.length
      ) {
        if (filter.interests && typeof filter.interests === "object") {
          filter.interests = {
            ...filter.interests,
            $all: dealBreakers.mustHaveInterests,
          };
        } else {
          filter.interests = { $all: dealBreakers.mustHaveInterests };
        }
      }
      // Candidate must include NONE of excludeInterests
      if (
        Array.isArray(dealBreakers.excludeInterests) &&
        dealBreakers.excludeInterests.length
      ) {
        if (filter.interests && typeof filter.interests === "object") {
          filter.interests = {
            ...filter.interests,
            $nin: dealBreakers.excludeInterests,
          };
        } else {
          filter.interests = { $nin: dealBreakers.excludeInterests };
        }
      }
      // Lifestyle exclusions
      if (
        Array.isArray(dealBreakers.excludeSmoking) &&
        dealBreakers.excludeSmoking.length
      ) {
        filter["lifestyle.smoking"] = { $nin: dealBreakers.excludeSmoking };
      }
      if (
        Array.isArray(dealBreakers.excludeMaritalStatuses) &&
        dealBreakers.excludeMaritalStatuses.length
      ) {
        filter["lifestyle.maritalStatus"] = {
          $nin: dealBreakers.excludeMaritalStatuses,
        };
      }
      if (dealBreakers.requireHasKids === true) {
        filter["lifestyle.hasKids"] = true;
      } else if (dealBreakers.requireHasKids === false) {
        filter["lifestyle.hasKids"] = { $in: [false, null] };
      }
    }

    // Distance filtering (if user + candidate have coordinates)
    if (maxDistance && currentUser.location?.coordinates?.length === 2) {
      const rawKm = parseInt(maxDistance);
      // Guard against invalid or default [0,0] coordinates
      const [lng, lat] = currentUser.location.coordinates;
      const hasValidCoords =
        Array.isArray(currentUser.location.coordinates) &&
        currentUser.location.coordinates.length === 2 &&
        !(lng === 0 && lat === 0);
      // Clamp distance between 1 and 200 km (matches UI slider bounds)
      const distKm = Math.min(200, Math.max(1, rawKm));
      if (!isNaN(distKm) && distKm > 0 && hasValidCoords) {
        filter["location"] = {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: currentUser.location.coordinates, // [lng, lat]
            },
            $maxDistance: distKm * 1000, // meters
          },
        };
      }
    }

    // Get users who haven't been liked/passed by current user recently
    // Dynamic time windows based on multiple factors:
    // 1. Geographic location (city size)
    // 2. Premium status
    // 3. Available pool size
    // 4. User preferences
    const now = new Date();

    // Calculate dynamic pass window
    const calculatePassWindow = async () => {
      // Base window: 4 hours for free users, 1-2 hours for premium
      const userSubscription = await canUserPerformAction(
        userId,
        "travel_mode"
      );
      const isPremium = userSubscription.allowed; // Premium Plus users can use travel mode
      const baseHours = isPremium ? 1.5 : 4;

      // Geographic adjustment - estimate city size from user count in area
      let geoMultiplier = 1;
      if (currentUser.location?.coordinates?.length === 2) {
        const [lng, lat] = currentUser.location.coordinates;
        const hasValidCoords = !(lng === 0 && lat === 0);

        if (hasValidCoords) {
          // Count nearby users within 50km to estimate city size using $geoWithin
          let nearbyCount = 0;
          try {
            nearbyCount = await User.countDocuments({
              _id: { $ne: userId },
              isActive: true,
              location: {
                $geoWithin: {
                  $centerSphere: [[lng, lat], 50000 / 6378100] // 50km radius in radians
                }
              },
            });
          } catch {
            // Fall back to default multiplier if geo query fails
            nearbyCount = 500; // Default to medium city size
          }

          // Adjust based on local population density
          if (nearbyCount < 100) {
            geoMultiplier = 0.5; // Small city: shorter window (30 min - 2 hours)
          } else if (nearbyCount < 500) {
            geoMultiplier = 0.75; // Medium city: slightly shorter (45 min - 3 hours)
          } else if (nearbyCount > 2000) {
            geoMultiplier = 1.5; // Large city: longer window (1.5 - 6 hours)
          }
          // Default (100-2000 users): multiplier = 1
        }
      }

      // Calculate final window with minimum bounds
      const finalHours = Math.max(0.5, Math.min(8, baseHours * geoMultiplier));
      return finalHours;
    };

    const passWindowHours = await calculatePassWindow();
    const passWindow = new Date(
      now.getTime() - passWindowHours * 60 * 60 * 1000
    );
    const likeWindow = new Date(now);
    likeWindow.setUTCHours(0, 0, 0, 0); // Start of today

    // Premium feature: "Show passed profiles again"
    // Check if user wants to see passed profiles (premium feature)
    const showPassedAgain = searchParams.get("showPassedAgain") === "true";
    const canShowPassedAgain = await canUserPerformAction(
      userId,
      "travel_mode"
    ); // Using travel_mode as proxy for Premium Plus

    // Get recent interactions with different time windows
    const recentLikes = await Interaction.find({
      userId: userId,
      action: { $in: ["like", "super_like"] },
      createdAt: { $gte: likeWindow },
    }).select("targetUserId");

    // For passes: apply window unless premium user specifically requested to see passed profiles
    let recentPasses = [];
    if (!showPassedAgain || !canShowPassedAgain.allowed) {
      recentPasses = await Interaction.find({
        userId: userId,
        action: "pass",
        createdAt: { $gte: passWindow },
      }).select("targetUserId");
    }

    const excludedUserIds = [
      ...recentLikes.map((i) => i.targetUserId),
      ...recentPasses.map((i) => i.targetUserId),
    ];

    if (excludedUserIds.length > 0) {
      const origId =
        typeof filter._id === "object" && filter._id !== null ? filter._id : {};
      filter._id = { ...origId, $nin: excludedUserIds };
    }

    // Enforce privacy visibility: exclude hidden, restrict mutual-only to matched connections
    // Build mutual connections set (matched users)
    const matched = await Match.find({
      isActive: true,
      status: "matched",
      $or: [{ user1: userId }, { user2: userId }],
    })
      .select("user1 user2")
      .lean();
    const mutualIds = new Set<string>();
    matched.forEach((m) => {
      const other =
        m.user1?.toString() === userId.toString() ? m.user2 : m.user1;
      if (other) mutualIds.add(other.toString());
    });

    // Apply visibility filter: show profiles visible to everyone OR mutual-only if matched
    const visibilityOrClauses: Array<Record<string, unknown>> = [
      { "privacy.visibility": "everyone" },
    ];
    if (mutualIds.size > 0) {
      visibilityOrClauses.push({
        "privacy.visibility": "mutual",
        _id: { $in: Array.from(mutualIds) },
      });
    } else {
      // When no mutuals, exclude mutual-only profiles
      filter["privacy.visibility"] = { $ne: "mutual" };
    }
    // Always exclude hidden
    filter["privacy.visibility"] = filter["privacy.visibility"]
      ? { ...(filter["privacy.visibility"] as object), $ne: "hidden" }
      : { $ne: "hidden" };
    if (visibilityOrClauses.length > 1) {
      // Combine with $or only when mutual clause exists
      filter.$or = visibilityOrClauses;
    }

    // Optionally gather baseline (for diagnostics or zero-result fallback)
    let baselineCount: number | undefined;
    if (diagnostics) {
      baselineCount = await User.countDocuments({
        _id: { $ne: userId },
        isActive: true,
      });
    }

    // Exclude blocked relationships
    const blockedRels = await Block.find({
      active: true,
      $or: [{ blocker: userId }, { blocked: userId }],
    }).select("blocker blocked");
    const excludeIds = new Set<string>();
    blockedRels.forEach((b) => {
      if (b.blocker?.toString() === userId.toString() && b.blocked) {
        excludeIds.add(b.blocked.toString());
      }
      if (b.blocked?.toString() === userId.toString() && b.blocker) {
        excludeIds.add(b.blocker.toString());
      }
    });
    if (excludeIds.size > 0) {
      const origId =
        typeof filter._id === "object" && filter._id !== null ? filter._id : {};
      const idFilter: { [key: string]: unknown; $nin: string[] } = {
        ...origId,
        $nin: Array.from(excludeIds),
      };
      filter._id = idFilter as object;
    }

    // Execute main query
    let users;
    try {
      users = await User.find(filter)
        .select(
          "firstName dateOfBirth location bio interests photos verification lifestyle"
        )
        .skip(offset)
        .limit(limit)
        .lean();
    } catch (queryError) {
      throw queryError;
    }

    // If distance filtering was applied and no results, relax by removing geospatial constraint
    const appliedDistance =
      !!(filter as Record<string, unknown>).location &&
      typeof (filter as Record<string, unknown>).location === "object" &&
      (filter as Record<string, { $near?: unknown }>).location.$near;
    let distanceRelaxed: boolean | undefined;
    if (users.length === 0 && appliedDistance) {
      const relaxedFilter: typeof filter = { ...filter };
      delete (relaxedFilter as Record<string, unknown>).location;
      try {
        users = await User.find(relaxedFilter)
          .select(
            "firstName dateOfBirth location bio interests photos verification lifestyle"
          )
          .skip(offset)
          .limit(limit)
          .lean();
        distanceRelaxed = true;
      } catch {
        // ignore re-query errors
      }
    }

    // Pool-size aware timing: If initial pool is small, progressively relax pass window
    let adjustedUsers = users;
    let passWindowAdjusted = false;

    // Only apply pool-size adjustment if we actually excluded passed profiles
    const passesExcluded = recentPasses.length;
    if (users.length < 5 && passesExcluded > 0) {
      // Small pool detected - try progressively shorter pass windows
      const reducedPassHours = Math.max(0.25, passWindowHours * 0.5); // Cut window in half, minimum 15 minutes
      const reducedPassWindow = new Date(
        now.getTime() - reducedPassHours * 60 * 60 * 1000
      );

      const reducedPasses = await Interaction.find({
        userId: userId,
        action: "pass",
        createdAt: { $gte: reducedPassWindow },
      }).select("targetUserId");

      const reducedExcludedIds = [
        ...recentLikes.map((i) => i.targetUserId),
        ...reducedPasses.map((i) => i.targetUserId),
      ];

      // Try with reduced exclusions
      const poolSizeFilter = { ...filter };
      if (reducedExcludedIds.length > 0) {
        const origId =
          typeof poolSizeFilter._id === "object" && poolSizeFilter._id !== null
            ? poolSizeFilter._id
            : {};
        poolSizeFilter._id = { ...origId, $nin: reducedExcludedIds };
      }

      try {
        const poolSizeUsers = await User.find(poolSizeFilter)
          .select(
            "firstName dateOfBirth location bio interests photos verification lifestyle"
          )
          .skip(offset)
          .limit(limit)
          .lean();

        if (poolSizeUsers.length > users.length) {
          adjustedUsers = poolSizeUsers;
          passWindowAdjusted = true;
        }
      } catch {
        // ignore errors, keep original results
      }
    }

    users = adjustedUsers;

    // If still no results and user has many recent interactions, show some profiles they interacted with before
    // (but not recently) to give them something to see - this helps new users who exhaust profiles quickly
    let showPreviouslyInteracted = false;
    if (users.length === 0 && excludedUserIds.length >= 5) {
      // Remove the recent interaction filter and try again
      const relaxedFilter: typeof filter = { ...filter };

      // Reset the _id filter to exclude only blocked users (not recent interactions)
      if (excludeIds.size > 0) {
        (relaxedFilter as { _id?: { $nin: string[] } })._id = {
          $nin: Array.from(excludeIds),
        };
      } else {
        delete (relaxedFilter as { _id?: unknown })._id;
      }

      try {
        users = await User.find(relaxedFilter)
          .select(
            "firstName dateOfBirth location bio interests photos verification lifestyle"
          )
          .skip(offset)
          .limit(Math.min(limit, 3)) // Show fewer when relaxing
          .lean();
        showPreviouslyInteracted = true;
      } catch {
        // ignore re-query errors
      }
    }

    // If no results and we have strong deal breakers, attempt a relaxed count to help client adjust
    let relaxedCount: number | undefined;
    if (users.length === 0 && dealBreakers) {
      const relaxedFilter: typeof filter = { ...filter };
      // Remove hard deal breaker clauses progressively
      delete relaxedFilter["verification.isVerified"]; // from deal breaker requirement
      if (
        relaxedFilter.interests &&
        typeof relaxedFilter.interests === "object"
      ) {
        const interestsObj = relaxedFilter.interests as Record<
          string,
          string[] | string | number | boolean | undefined
        >;
        const inArr = Array.isArray(interestsObj.$in)
          ? interestsObj.$in
          : undefined;
        if (inArr) {
          relaxedFilter.interests = { $in: inArr };
        } else {
          delete relaxedFilter.interests;
        }
      }
      delete relaxedFilter["lifestyle.smoking"];
      delete relaxedFilter["lifestyle.maritalStatus"];
      delete relaxedFilter["lifestyle.hasKids"];
      try {
        relaxedCount = await User.countDocuments(relaxedFilter);
      } catch {}
    }

    // Calculate compatibility based on shared interests
    const currentUserInterests = Array.isArray(currentUser.interests)
      ? currentUser.interests
      : [];
    const formattedUsers = users.map((user) => {
      const candidateInterests = Array.isArray(user.interests)
        ? user.interests
        : [];
      const sharedInterests = candidateInterests.filter((interest: string) =>
        currentUserInterests.includes(interest)
      );
      const compatibilityScore =
        candidateInterests.length > 0
          ? Math.round(
              (sharedInterests.length / candidateInterests.length) * 100
            )
          : 0;
      return {
        id: user._id,
        firstName: user.firstName,
        age: user.dateOfBirth
          ? Math.floor(
              (new Date().getTime() - new Date(user.dateOfBirth).getTime()) /
                (365.25 * 24 * 60 * 60 * 1000)
            )
          : null,
        location: user.location,
        bio: user.bio,
        interests: user.interests,
        photos: user.photos,
        verification: user.verification,
        compatibilityScore,
        commonInterests: sharedInterests.slice(0, 3),
      };
    });

    return NextResponse.json(
      {
        matches: formattedUsers,
        hasMore: users.length === limit,
        totalShown: offset + users.length,
        advancedFiltersAvailable,
        gracePeriodMessage: gracePeriodMessage || null,
        diagnostics: diagnostics
          ? {
              appliedFilter: filter,
              baselineCount,
              relaxedCount: relaxedCount ?? null,
              dealBreakersApplied: !!dealBreakers,
              distanceRelaxed: distanceRelaxed ?? false,
              showPreviouslyInteracted,
              recentInteractionsCount: excludedUserIds.length,
              recentInteractedUsers: excludedUserIds,
              // New dynamic timing diagnostics
              dynamicPassWindow: {
                calculatedHours: passWindowHours,
                isPremium: canShowPassedAgain.allowed,
                showPassedAgainRequested: showPassedAgain,
                passWindowAdjusted,
                passesExcludedCount: passesExcluded,
              },
            }
          : undefined,
      },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  } catch (error: unknown) {
    // Error handling without logging

    if (
      error instanceof Error &&
      (error.message === "Authentication token is required" ||
        error.message === "Invalid or expired token")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
