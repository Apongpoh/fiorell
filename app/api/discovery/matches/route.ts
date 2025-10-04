import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Block from "@/models/Block";
import Like from "@/models/Like";
import Match from "@/models/Match";
import { verifyAuth } from "@/lib/auth";

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
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");
    const minAge = searchParams.get("minAge");
    const maxAge = searchParams.get("maxAge");
    const gender = searchParams.get("gender");
    const verifiedOnly = searchParams.get("verifiedOnly") === "true";
    const interestsParam = searchParams.get("interests");
    const maxDistance = searchParams.get("maxDistance");
    const diagnostics = searchParams.get("diag") === "1";

    // Build filter based on user preferences
    const filter: {
      [key: string]: unknown;
      $or?: Array<Record<string, unknown>>;
    } = {
      _id: { $ne: userId }, // Exclude current user
      isActive: true,
    };

    // Gender priority: explicit query overrides stored preference
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

    // Filter by age range
    const ageRange = {
      min: minAge ? parseInt(minAge) : currentUser.preferences?.ageRange?.min,
      max: maxAge ? parseInt(maxAge) : currentUser.preferences?.ageRange?.max,
    };
    if (ageRange.min && ageRange.max) {
      const currentYear = new Date().getFullYear();
      const minBirthYear = currentYear - ageRange.max; // older
      const maxBirthYear = currentYear - ageRange.min; // younger
      filter.dateOfBirth = {
        $gte: new Date(minBirthYear, 0, 1),
        $lte: new Date(maxBirthYear, 11, 31),
      };
    }

    // Verified only
    if (verifiedOnly) {
      filter["verification.isVerified"] = true;
    }

    // Build interest filter object separately so we can merge $in/$all/$nin safely
    const interestFilter: Record<
      string,
      string[] | string | number | boolean | undefined
    > = {};
    if (interestsParam) {
      const interests = interestsParam
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean);
      if (interests.length) {
        interestFilter.$in = interests;
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
        interestFilter.$all = dealBreakers.mustHaveInterests;
      }
      // Candidate must include NONE of excludeInterests
      if (
        Array.isArray(dealBreakers.excludeInterests) &&
        dealBreakers.excludeInterests.length
      ) {
        interestFilter.$nin = dealBreakers.excludeInterests;
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

    // Get users who haven't been liked/passed by current user
    const existingInteractions = await Like.find({
      fromUserId: userId,
    }).select("toUserId");

    const interactedUserIds = existingInteractions.map((like) => like.toUserId);
    if (interactedUserIds.length > 0) {
      const origId =
        typeof filter._id === "object" && filter._id !== null ? filter._id : {};
      filter._id = { ...origId, $nin: interactedUserIds };
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

    // Resolve interest filter conflicts (intersection between $all and $nin makes query unsatisfiable)
    if (
      Array.isArray(interestFilter.$all) &&
      Array.isArray(interestFilter.$nin)
    ) {
      const allArr = interestFilter.$all;
      const ninArr = interestFilter.$nin;
      const conflicts = allArr.filter((x: string) => ninArr.includes(x));
      if (conflicts.length) {
        interestFilter.$nin = ninArr.filter(
          (x: string) => !conflicts.includes(x)
        );
        if (interestFilter.$nin.length === 0) delete interestFilter.$nin;
      }
    }

    if (Object.keys(interestFilter).length) {
      if (typeof filter.interests === "object" && filter.interests !== null) {
        filter.interests = {
          ...(filter.interests as object),
          ...interestFilter,
        };
      } else {
        filter.interests = { ...interestFilter };
      }
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
    let users = await User.find(filter)
      .select(
        "firstName dateOfBirth location bio interests photos verification lifestyle"
      )
      .skip(offset)
      .limit(limit)
      .lean();

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
        diagnostics: diagnostics
          ? {
              appliedFilter: filter,
              baselineCount,
              relaxedCount: relaxedCount ?? null,
              dealBreakersApplied: !!dealBreakers,
              distanceRelaxed: distanceRelaxed ?? false,
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
    console.error("Get matches error:", error);

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
