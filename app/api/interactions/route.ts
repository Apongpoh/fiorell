import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/mongodb";
import Interaction from "@/models/Interaction";
import User from "@/models/User";
import { verifyAuth } from "@/lib/auth";
// Block model (ensure path alias resolves)
import Block from "../../../models/Block";
import { isObjectId } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rateLimit";



export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const { userId: authUserId } = verifyAuth(request);
    const body = await request.json();

    // Force userId to be auth user to prevent spoofing
    body.userId = authUserId;

    // Validate required fields
    if (!body.targetUserId || !body.action) {
      return NextResponse.json(
        { error: "Missing required fields: targetUserId, action" },
        { status: 400 }
      );
    }

    if (!isObjectId(body.targetUserId)) {
      return NextResponse.json(
        { error: "Invalid target user id" },
        { status: 400 }
      );
    }
    if (body.userId === body.targetUserId) {
      return NextResponse.json(
        { error: "Cannot interact with yourself" },
        { status: 400 }
      );
    }

    // Validate action type
    if (!["like", "pass", "super_like"].includes(body.action)) {
      return NextResponse.json(
        { error: "Invalid action. Must be like, pass, or super_like" },
        { status: 400 }
      );
    }

    // Database-backed rate limiting
    const rateLimitResult = await checkRateLimit({
      resourceType: body.action === "super_like" ? "superlike" : "like",
      userId: body.userId,
      windowMs: 60_000, // 1 minute window
      maxAttempts: 30, // max 30 interactions per minute
    });

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: "Too many actions, slow down",
          remainingAttempts: rateLimitResult.remainingAttempts,
          resetTime: rateLimitResult.resetTime,
        },
        { status: 429 }
      );
    }

    // Block checks
    const block = await Block.findOne({
      $or: [
        { blocker: body.userId, blocked: body.targetUserId, active: true },
        { blocker: body.targetUserId, blocked: body.userId, active: true },
      ],
    });
    if (block) {
      return NextResponse.json(
        { error: "Interaction blocked between users" },
        { status: 403 }
      );
    }
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Check for existing interaction today
      const today = new Date();
      const startOfDay = new Date(today);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const existingTodayInteraction = await Interaction.findOne({
        userId: body.userId,
        targetUserId: body.targetUserId,
        action: body.action,
        createdAt: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      }).session(session);

      if (existingTodayInteraction) {
        await session.abortTransaction();
        return NextResponse.json(
          { error: `You can only ${body.action.replace('_', ' ')} this user once per day. Try again tomorrow!` },
          { status: 409 }
        );
      }

      // Create the new interaction
      const newInteraction = new Interaction({
        userId: body.userId,
        targetUserId: body.targetUserId,
        action: body.action,
        isMatch: false,
      });

      await newInteraction.save({ session });

      // Update target user's received likes/super likes count
      if (body.action === "like" || body.action === "super_like") {
        const updateField =
          body.action === "like"
            ? "stats.totalLikesReceived"
            : "stats.totalSuperLikesReceived";

        await User.findByIdAndUpdate(
          body.targetUserId,
          { $inc: { [updateField]: 1 } },
          { session }
        );
      }

      // Check for a match
      let match = null;
      if (body.action === "like" || body.action === "super_like") {
        const reciprocal = await Interaction.findOne({
          userId: body.targetUserId,
          targetUserId: body.userId,
          action: { $in: ["like", "super_like"] },
        }).session(session);

        if (reciprocal) {
          // Update both interactions to mark them as matches
          await Interaction.updateMany(
            {
              $or: [
                { userId: body.userId, targetUserId: body.targetUserId },
                { userId: body.targetUserId, targetUserId: body.userId },
              ],
            },
            { isMatch: true },
            { session }
          );

          // Increment match count for both users
          await User.updateMany(
            {
              _id: { $in: [body.userId, body.targetUserId] },
            },
            { $inc: { "stats.totalMatches": 1 } },
            { session }
          );

          match = {
            id: `match-${Date.now()}`,
            userId: body.userId,
            matchedUserId: body.targetUserId,
            timestamp: new Date().toISOString(),
          };
        }
      }

      // Commit the transaction
      await session.commitTransaction();

      return NextResponse.json({
        success: true,
        match,
      });
    } catch (error) {
      // If anything fails, abort the transaction
      await session.abortTransaction();
      throw error;
    } finally {
      // End the session
      await session.endSession();
    }
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
