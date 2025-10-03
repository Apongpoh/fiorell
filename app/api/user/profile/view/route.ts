import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import ProfileView from "@/models/ProfileView";
import { verifyAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    const body = await request.json();
    const { targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json(
        { error: "Missing targetUserId" },
        { status: 400 }
      );
    }

    // Don't record self-views
    if (userId === targetUserId) {
      return NextResponse.json(
        { message: "Self view not recorded" },
        { status: 200 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start a session for the transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check if user has already viewed this profile today
      const existingView = await ProfileView.findOne({
        userId,
        targetUserId,
        createdAt: { $gte: today },
      }).session(session);

      if (!existingView) {
        // Create new profile view
        await ProfileView.create(
          [
            {
              userId,
              targetUserId,
              createdAt: new Date(),
            },
          ],
          { session }
        );
      }

      await session.commitTransaction();
      return NextResponse.json(
        { message: "Profile view recorded" },
        { status: 200 }
      );
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error: unknown) {
    console.error("Profile view error:", error);

    if (
      (typeof error === "object" &&
        error !== null &&
        "message" in error &&
        (error as { message: string }).message ===
          "Authentication token is required") ||
      (error as { message: string }).message === "Invalid or expired token"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
