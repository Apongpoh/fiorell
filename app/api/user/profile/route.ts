import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User, { IUser } from "@/models/User";
import { verifyAuth } from "@/lib/auth";
import { computeProfileCompletion } from "@/lib/profileCompletion";
import ProfileView from "@/models/ProfileView";
import { sanitizeBio, sanitizeCity, validateInterests } from "@/lib/validators";
import { canUserPerformAction } from "@/lib/subscription";

// Get user profile
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user account is suspended/banned
    if (user.isActive === false) {
      return NextResponse.json(
        { 
          error: "Account suspended", 
          accountSuspended: true,
          message: "Your account has been suspended. Please contact support for assistance."
        }, 
        { status: 403 }
      );
    }

    const completion = computeProfileCompletion(user as Partial<IUser>);

    // Calculate real-time views
    let profileViews = 0;
    let viewsToday = 0;
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      profileViews = await ProfileView.countDocuments({
        targetUserId: user._id.toString(),
      });
      viewsToday = await ProfileView.countDocuments({
        targetUserId: user._id.toString(),
        createdAt: { $gte: startOfDay },
      });
    } catch {}

    // Return user data with profile completion and real-time views
    const userResponse = {
      id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      age: user.age,
      gender: user.gender,
      location: user.location,
      bio: user.bio,
      interests: user.interests,
      photos: user.photos,
      preferences: user.preferences,
      lifestyle: user.lifestyle,
      verification: user.verification,
      privacy: user.privacy,
      subscription: user.subscription,
      stats: {
        ...user.stats,
        profileCompleteness: completion.percentage,
        profileScore: completion.score,
        profileBreakdown: completion.breakdown,
        profileViews,
        viewsToday,
      },
      isActive: user.isActive,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
      isAdmin: user.isAdmin,
    };

    return NextResponse.json({ user: userResponse }, { status: 200 });
  } catch (error: unknown) {
    console.error("Get profile error:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      ((error as { message: string }).message ===
        "Authentication token is required" ||
        (error as { message: string }).message === "Invalid or expired token")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Update user profile
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    const body = await request.json();
    const {
      firstName,
      lastName,
      gender,
      dateOfBirth,
      bio,
      location,
      interests,
      preferences,
      privacy,
      lifestyle,
    } = body;

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update fields if provided
    if (firstName !== undefined) user.firstName = firstName.trim();
    if (lastName !== undefined) user.lastName = lastName.trim();
    // Age is computed from dateOfBirth; ignore direct age assignment
    if (gender !== undefined) user.gender = gender;
    if (dateOfBirth !== undefined && dateOfBirth !== "")
      user.dateOfBirth = new Date(dateOfBirth);
    if (bio !== undefined) user.bio = sanitizeBio(String(bio));
    if (location !== undefined) {
      // Ensure location object is initialized with correct GeoJSON shape
      if (!user.location) {
        user.location = {
          type: "Point",
          coordinates: [0, 0],
          city: "",
        } as IUser["location"];
      }
      if (location.city !== undefined) {
        user.location.city = sanitizeCity(String(location.city || ""));
      }
      // Update coordinates if provided as [lng, lat]
      const coords = (location as { coordinates?: unknown }).coordinates;
      if (
        Array.isArray(coords) &&
        coords.length === 2 &&
        typeof coords[0] === "number" &&
        typeof coords[1] === "number"
      ) {
        // Normalize: expected [lng, lat]
        let lng = coords[0];
        let lat = coords[1];
        // Auto-correct common swap: if lng looks like latitude (>90 abs) and lat looks like longitude (>90 abs), swap
        const absLng = Math.abs(lng);
        const absLat = Math.abs(lat);
        if (absLng > 90 && absLat <= 90) {
          // likely swapped
          [lng, lat] = [lat, lng];
        }
        // Clamp to valid ranges
        lng = Math.max(-180, Math.min(180, lng));
        lat = Math.max(-90, Math.min(90, lat));
        
        // Check if user has significant location change and should use Travel Mode instead
        const currentCoords = user.location?.coordinates;
        if (currentCoords && Array.isArray(currentCoords) && currentCoords.length === 2) {
          // Calculate distance between old and new coordinates (rough calculation)
          const oldLng = currentCoords[0];
          const oldLat = currentCoords[1];
          const deltaLng = Math.abs(lng - oldLng);
          const deltaLat = Math.abs(lat - oldLat);
          
          // If coordinates change significantly (roughly 50+ km threshold)
          // Using 0.5 degrees as rough approximation (1 degree ≈ 111km at equator)
          const significantChange = deltaLng > 0.5 || deltaLat > 0.5;
          
          if (significantChange) {
            // Check if user can use Travel Mode
            const travelCheck = await canUserPerformAction(userId, 'travel_mode');
            if (!travelCheck.allowed) {
              // User cannot use Travel Mode, reject significant location changes
              return NextResponse.json(
                {
                  error: "Significant location changes require Travel Mode. Upgrade to Premium Plus to change your location or use the Travel Mode feature to explore other cities.",
                  code: "TRAVEL_MODE_REQUIRED",
                  upgradeRequired: true,
                  feature: "travel_mode"
                },
                { status: 403 }
              );
            } else {
              // User can use Travel Mode but should be using it instead of direct profile updates
              return NextResponse.json(
                {
                  error: "For location changes, please use Travel Mode instead of updating your profile directly. This ensures proper tracking and the best matching experience.",
                  code: "USE_TRAVEL_MODE",
                  suggestion: "Use the Travel Mode feature from your dashboard to change locations."
                },
                { status: 400 }
              );
            }
          }
        }
        
        // Allow minor location updates (fine-tuning current location)
        user.location.type = "Point";
        user.location.coordinates = [lng, lat];
      }
    }
    if (interests !== undefined) {
      user.interests = validateInterests(interests);
    }
    if (preferences !== undefined) {
      if (preferences.ageRange) {
        user.preferences.ageRange = preferences.ageRange;
      }
      if (preferences.maxDistance !== undefined) {
        user.preferences.maxDistance = preferences.maxDistance;
      }
      if (preferences.lookingFor !== undefined) {
        user.preferences.lookingFor = preferences.lookingFor;
      }
      if (preferences.dealBreakers) {
        user.preferences.dealBreakers = {
          ...(user.preferences.dealBreakers || {}),
          ...preferences.dealBreakers,
        } as IUser["preferences"]["dealBreakers"];
      }
    }
    if (lifestyle !== undefined) {
      // Merge lifestyle while allowing clearing (null/empty string removes field)
      const current = (user.lifestyle || {}) as Record<string, unknown>;
      const next: Record<string, unknown> = { ...current };
      for (const key of Object.keys(lifestyle)) {
        const val = (lifestyle as Record<string, unknown>)[key];
        if (val === null || val === "" || typeof val === "undefined") {
          delete next[key];
        } else {
          next[key] = val;
        }
      }
      user.lifestyle = next as IUser["lifestyle"];
    }
    if (privacy !== undefined) {
      user.privacy = { ...user.privacy, ...privacy };
    }

    await user.save();

    const completion = computeProfileCompletion(user as Partial<IUser>);

    // Return updated user data with profile completion
    const userResponse = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      age: user.age,
      gender: user.gender,
      location: user.location,
      bio: user.bio,
      interests: user.interests,
      photos: user.photos,
      preferences: user.preferences,
      lifestyle: user.lifestyle,
      verification: user.verification,
      privacy: user.privacy,
      subscription: user.subscription,
      stats: {
        ...user.stats,
        profileCompleteness: completion.percentage,
        profileScore: completion.score,
        profileBreakdown: completion.breakdown,
      },
      isActive: user.isActive,
      lastSeen: user.lastSeen,
      createdAt: user.createdAt,
      isAdmin: user.isAdmin,
    };

    return NextResponse.json(
      {
        message: "Profile updated successfully",
        user: userResponse,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = "Internal server error";
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      ((error as { message: string }).message ===
        "Authentication token is required" ||
        (error as { message: string }).message === "Invalid or expired token")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name: string }).name === "ValidationError" &&
      "message" in error &&
      typeof (error as { message: unknown }).message === "string"
    ) {
      return NextResponse.json(
        { error: (error as { message: string }).message },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Delete user account
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    // Find and delete user (hard delete)
    const result = await User.findByIdAndDelete(userId);
    if (!result) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Account deleted successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = "Internal server error";
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      ((error as { message: string }).message ===
        "Authentication token is required" ||
        (error as { message: string }).message === "Invalid or expired token")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
