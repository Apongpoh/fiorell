import { NextRequest, NextResponse } from "next/server";
import User from "@/models/User";
import connectToMongoDB from "@/lib/mongodb";
import { extractTokenFromRequest, verifyToken } from "@/lib/auth";

const getRequestUserId = (request: NextRequest): string => {
  const token =
    extractTokenFromRequest(request) || request.nextUrl.searchParams.get("token");

  if (!token) {
    throw new Error("Authentication token is required");
  }

  return verifyToken(token).userId;
};

const isAuthError = (error: unknown): boolean =>
  error instanceof Error &&
  (error.message === "Authentication token is required" ||
    error.message === "Invalid or expired token");

// Get user notification preferences
export async function GET(request: NextRequest) {
  try {
    await connectToMongoDB();

    const userId = getRequestUserId(request);

    // Find user
    const user = await User.findById(userId).select("notificationSettings");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return notification settings with defaults if not set
    const defaultSettings = {
      matches: { push: true, email: true, sound: true },
      messages: { push: true, email: false, sound: true },
      likes: { push: true, email: false, sound: false },
      views: { push: false, email: true, sound: false },
      quietHours: {
        enabled: false,
        startTime: "22:00",
        endTime: "08:00",
      },
    };

    const settings = user.notificationSettings || defaultSettings;

    return NextResponse.json({ settings });
  } catch (error: unknown) {
    console.error("Get notification settings error:", error);
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to get notification settings" },
      { status: 500 }
    );
  }
}

// Update user notification preferences
export async function PUT(request: NextRequest) {
  try {
    await connectToMongoDB();

    const userId = getRequestUserId(request);

    // Parse request body
    const { settings } = await request.json();

    if (!settings) {
      return NextResponse.json(
        { error: "Settings are required" },
        { status: 400 }
      );
    }

    // Update user notification settings
    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          notificationSettings: settings,
          updatedAt: new Date(),
        },
      },
      { new: true }
    ).select("notificationSettings");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Notification preferences updated successfully",
      settings: user.notificationSettings,
    });
  } catch (error: unknown) {
    if (isAuthError(error)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to update notification settings" },
      { status: 500 }
    );
  }
}
