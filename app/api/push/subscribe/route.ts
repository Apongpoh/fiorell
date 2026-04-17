import { NextRequest, NextResponse } from "next/server";
import User from "@/models/User";
import connectToMongoDB from "@/lib/mongodb";
import logger from "@/lib/logger";
import { verifyAuth } from "@/lib/auth";

const isAuthError = (error: unknown): boolean =>
  error instanceof Error &&
  (error.message === "Authentication token is required" ||
    error.message === "Invalid or expired token");

// Subscribe to push notifications
export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB();

    const { userId } = verifyAuth(request);

    // Parse request body
    const { subscription } = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: "Invalid subscription" },
        { status: 400 }
      );
    }

    // Add subscription to user's push subscriptions
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: {
          pushSubscriptions: {
            endpoint: subscription.endpoint,
            keys: subscription.keys,
            createdAt: new Date(),
            userAgent: request.headers.get("user-agent") || "Unknown",
          },
        },
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Push notification subscription added successfully",
    });
  } catch (error: unknown) {
    logger.error("Push subscription error:", {
      action: "push_subscription_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to subscribe to push notifications" },
      { status: 500 }
    );
  }
}

// Unsubscribe from push notifications
export async function DELETE(request: NextRequest) {
  try {
    await connectToMongoDB();

    const { userId } = verifyAuth(request);

    // Parse request body
    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json(
        { error: "Endpoint is required" },
        { status: 400 }
      );
    }

    // Remove subscription from user's push subscriptions
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $pull: {
          pushSubscriptions: { endpoint },
        },
      },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Push notification subscription removed successfully",
    });
  } catch (error: unknown) {
    logger.error("Push unsubscribe error:", {
      action: "push_unsubscribe_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to unsubscribe from push notifications" },
      { status: 500 }
    );
  }
}
