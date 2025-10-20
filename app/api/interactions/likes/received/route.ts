// app/api/interactions/likes/received/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyAuth } from "@/lib/auth";
import { canUserPerformAction } from "@/lib/subscription";
import Interaction from "@/models/Interaction";

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    // Check if user can see who liked them (Premium feature)
    const canSeeLikes = await canUserPerformAction(userId, "see_who_liked_you");
    if (!canSeeLikes.allowed) {
      return NextResponse.json(
        { error: canSeeLikes.reason || "Premium subscription required to see who liked you" },
        { status: 403 }
      );
    }

    // Get URL parameters for pagination
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    // Find all likes received by this user
    const likes = await Interaction.find({
      targetUserId: userId,
      action: { $in: ["like", "super_like"] }
    })
    .populate({
      path: "userId",
      select: "firstName photos age location",
      model: "User"
    })
    .sort({ timestamp: -1 })
    .skip(offset)
    .limit(limit)
    .lean();

    // Format the response
    const formattedLikes = likes.map(like => ({
      _id: like._id,
      fromUser: {
        _id: like.userId._id,
        firstName: like.userId.firstName,
        photos: like.userId.photos || [],
        age: like.userId.age,
        location: like.userId.location || { city: "Unknown" }
      },
      type: like.action,
      createdAt: like.timestamp
    }));

    // Get total count for pagination
    const totalCount = await Interaction.countDocuments({
      targetUserId: userId,
      action: { $in: ["like", "super_like"] }
    });

    return NextResponse.json({
      likes: formattedLikes,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });

  } catch (error) {
    console.error("Failed to fetch received likes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}