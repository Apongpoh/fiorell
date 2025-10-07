import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import User from "@/models/User";
import connectToMongoDB from "@/lib/mongodb";
import logger from "@/lib/logger";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Subscribe to push notifications
export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB();

    // Get token from Authorization header
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

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
      decoded.userId,
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
    if (error instanceof jwt.JsonWebTokenError) {
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

    // Get token from Authorization header
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

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
      decoded.userId,
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
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to unsubscribe from push notifications" },
      { status: 500 }
    );
  }
}
