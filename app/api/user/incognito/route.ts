import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyAuth } from "@/lib/auth";
import User from "@/models/User";
import { canUserPerformAction } from "@/lib/subscription";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    const body = await request.json();
    const { enabled } = body;

    // Check if user can use incognito mode (Premium Plus feature)
    const incognitoCheck = await canUserPerformAction(userId, "incognito");
    if (!incognitoCheck.allowed) {
      return NextResponse.json(
        {
          error: incognitoCheck.reason,
          code: "PREMIUM_FEATURE_REQUIRED",
          upgradeRequired: true,
          feature: "incognito_mode",
        },
        { status: 403 }
      );
    }

    // Update user's incognito mode setting
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          "privacy.incognitoMode": enabled,
          "privacy.incognitoModeUpdatedAt": new Date(),
        },
      },
      { new: true, select: "privacy.incognitoMode" }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: `Incognito mode ${
          enabled ? "enabled" : "disabled"
        } successfully`,
        incognitoMode: updatedUser.privacy?.incognitoMode || false,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Incognito mode error:", error);

    if (
      error instanceof Error &&
      (error.message === "Authentication token is required" ||
        error.message === "Invalid or expired token")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get user's incognito mode status
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verify authentication
    const { userId } = verifyAuth(request);

    const user = await User.findById(userId).select("privacy.incognitoMode");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        incognitoMode: user.privacy?.incognitoMode || false,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error("Get incognito status error:", {
      action: "get_incognito_status_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });

    if (
      error instanceof Error &&
      (error.message === "Authentication token is required" ||
        error.message === "Invalid or expired token")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
