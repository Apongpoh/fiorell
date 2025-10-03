import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User, { IUser } from "@/models/User";
import { verifyAuth } from "@/lib/auth";
import { computeProfileCompletion } from "@/lib/profileCompletion";

// NOTE: Next.js (v15+) typed dynamic route context.params as a Promise in this project configuration.
// Accept the promised params object and await it to extract the id, matching the inferred RouteHandlerConfig.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    // Resolve params (id)
    const { id } = await context.params;

    const user = await User.findById(id).select(
      "firstName dateOfBirth photos location bio interests verification lastSeen lifestyle stats"
    );

    if (!user) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Calculate age from dateOfBirth
    const age = user.dateOfBirth
      ? Math.floor(
          (Date.now() - new Date(user.dateOfBirth).getTime()) /
            (1000 * 60 * 60 * 24 * 365.25)
        )
      : null;

    const completion = computeProfileCompletion(user as Partial<IUser>);

    // Compute mutual interests with viewer (if different user)
    let mutualInterests: string[] = [];
    if (userId && userId.toString() !== id.toString()) {
      try {
        const viewer = await User.findById(userId).select("interests");
        if (viewer?.interests && user.interests) {
          const viewerSet = new Set(
            viewer.interests.map((i: string) => i.toLowerCase())
          );
          mutualInterests = user.interests.filter((i: string) =>
            viewerSet.has(i.toLowerCase())
          );
        }
      } catch {}
    }

    // Derive aggregate like counts
    const stats = (user.stats ?? {}) as Record<string, unknown>;
    const totalLikes =
      typeof stats.totalLikesReceived === "number"
        ? stats.totalLikesReceived
        : 0;
    const totalSuperLikes =
      typeof stats.totalSuperLikesReceived === "number"
        ? stats.totalSuperLikesReceived
        : 0;
    const totalMatches =
      typeof stats.totalMatches === "number" ? stats.totalMatches : 0;
    const profileViews =
      typeof stats.profileViews === "number" ? stats.profileViews : 0;

    // Format the response including completion & score
    const formattedUser = {
      id: user._id,
      firstName: user.firstName,
      age,
      photos: user.photos,
      location: user.location,
      bio: user.bio,
      interests: user.interests || [],
      verification: user.verification || { isVerified: false },
      lastSeen: user.lastSeen,
      lifestyle: user.lifestyle || null,
      stats: {
        profileCompleteness: completion.percentage,
        profileScore: completion.score,
        profileBreakdown: completion.breakdown,
        totalLikes,
        totalSuperLikes,
        totalMatches,
        profileViews,
        mutualInterests,
        mutualInterestsCount: mutualInterests.length,
      },
    };

    return NextResponse.json({ user: formattedUser });
  } catch (error: unknown) {
    console.error("Error fetching user profile:", error);
    let message = "Failed to fetch profile";
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as { message: unknown }).message === "string"
    ) {
      message = (error as { message: string }).message;
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
