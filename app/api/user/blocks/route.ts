import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyAuth } from "@/lib/auth";
import Block from "@/models/Block";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { userId } = verifyAuth(req);
    const blocks = await Block.find({ blocker: userId, active: true })
      .select("blocked reason createdAt")
      .lean();

    // Populate blocked user names and photos
    const blockedUserIds = blocks.map((b) => b.blocked);
    const users = (await User.find({ _id: { $in: blockedUserIds } })
      .select("firstName photos defaultPhoto")
      .lean()) as Array<{
      _id: unknown;
      firstName?: string;
      photos?: Array<{ url?: string }>;
      defaultPhoto?: string;
    }>;

    const userMap = new Map<string, { firstName?: string; photo?: string }>();
    users.forEach((u) => {
      userMap.set(String(u._id), {
        firstName: u.firstName,
        photo:
          (u.photos?.[0]?.url ?? undefined) ||
          u.defaultPhoto ||
          "/api/placeholder/profile",
      });
    });

    const result = blocks.map((b) => ({
      id: String(b.blocked),
      name: userMap.get(String(b.blocked))?.firstName || "Unknown",
      photo:
        userMap.get(String(b.blocked))?.photo || "/api/placeholder/profile",
      reason: b.reason,
      createdAt: b.createdAt,
    }));

    return NextResponse.json({ blocked: result }, { status: 200 });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "message" in error) {
      const msg = (error as { message: string }).message;
      if (
        msg.includes("Invalid or expired token") ||
        msg.includes("Authentication token")
      ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectToDatabase();
    const { userId } = verifyAuth(req);
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("targetUserId");

    if (!targetUserId) {
      return NextResponse.json(
        { error: "targetUserId is required" },
        { status: 400 }
      );
    }

    const block = await Block.findOneAndUpdate(
      { blocker: userId, blocked: targetUserId },
      { active: false },
      { new: true }
    );

    if (!block) {
      return NextResponse.json({ error: "Block not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "User unblocked" }, { status: 200 });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "message" in error) {
      const msg = (error as { message: string }).message;
      if (
        msg.includes("Invalid or expired token") ||
        msg.includes("Authentication token")
      ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
