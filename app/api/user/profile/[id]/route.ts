import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User, { IUser } from "@/models/User";
import Block from "@/models/Block";
import ProfileView from "@/models/ProfileView";
import { verifyAuth } from "@/lib/auth";
import { computeProfileCompletion } from "@/lib/profileCompletion";
import { logger } from "@/lib/logger";

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
      "firstName dateOfBirth photos location bio interests verification lastSeen lifestyle stats privacy"
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

    // Check block relationship between viewer and profile
    let blockedByYou = false;
    let blockedYou = false;
    try {
      const blockRel = await Block.find({
        active: true,
        $or: [
          { blocker: userId, blocked: id },
          { blocker: id, blocked: userId },
        ],
      }).lean();
      blockedByYou = blockRel.some(
        (b) =>
          b.blocker.toString() === userId.toString() &&
          b.blocked.toString() === id.toString()
      );
      blockedYou = blockRel.some(
        (b) =>
          b.blocker.toString() === id.toString() &&
          b.blocked.toString() === userId.toString()
      );
    } catch {}

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

    // Count profile view once per day if viewer is not the profile owner and neither is blocked
    if (
      userId &&
      userId.toString() !== id.toString() &&
      !blockedByYou &&
      !blockedYou
    ) {
      try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const existingView = await ProfileView.findOne({
          userId: userId.toString(),
          targetUserId: id.toString(),
          createdAt: { $gte: startOfDay },
        }).lean();
        if (!existingView) {
          await ProfileView.create({
            userId: userId.toString(),
            targetUserId: id.toString(),
          });
          // Increment stats counter
          await User.updateOne(
            { _id: id },
            { $inc: { "stats.profileViews": 1 } }
          );
        }
      } catch {
        // Non-blocking: ignore view counting errors
      }
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

    // Views today and total views from ProfileView collection
    let profileViews = 0;
    let viewsToday = 0;
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      profileViews = await ProfileView.countDocuments({
        targetUserId: id.toString(),
      });
      viewsToday = await ProfileView.countDocuments({
        targetUserId: id.toString(),
        createdAt: { $gte: startOfDay },
      });
    } catch {}

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
      blockedByYou,
      blockedYou,
      stats: {
        profileCompleteness: completion.percentage,
        profileScore: completion.score,
        profileBreakdown: completion.breakdown,
        totalLikes,
        totalSuperLikes,
        totalMatches,
        profileViews,
        viewsToday,
        mutualInterests,
        mutualInterestsCount: mutualInterests.length,
      },
      privacy: user.privacy ?? {},
    };

    return NextResponse.json({ user: formattedUser });
  } catch (error: unknown) {
    logger.error("Error fetching user profile:", {
      action: "get_user_profile_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
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
