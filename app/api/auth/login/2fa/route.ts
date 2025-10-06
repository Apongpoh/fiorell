import { NextRequest, NextResponse } from "next/server";
import { verify2FACode } from "@/lib/2fa";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { generateToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { tempUserId, code } = body;
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    // Basic validation
    if (!tempUserId || !code) {
      return NextResponse.json(
        { error: "User ID and verification code are required" },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }
      );
    }

    // Rate limiting: max 5 2FA attempts per IP+tempUserId per 15 minutes
    const LoginAttempt = (await import("@/models/LoginAttempt")).default;
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentAttempts = await LoginAttempt.countDocuments({
      ip,
      email: tempUserId, // Use tempUserId as identifier for 2FA attempts
      createdAt: { $gte: fifteenMinutesAgo },
    });

    if (recentAttempts >= 5) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }
      );
    }

    // Find user by temp ID
    const user = await User.findById(tempUserId);
    if (!user) {
      // Log failed attempt
      await LoginAttempt.create({ ip, email: tempUserId });
      return NextResponse.json(
        { error: "User not found" },
        {
          status: 401,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }
      );
    }

    // Check if 2FA is enabled and verify code
    if (!user.twoFA?.enabled || !user.twoFA?.secret) {
      await LoginAttempt.create({ ip, email: tempUserId });
      return NextResponse.json(
        { error: "Two-factor authentication is not enabled" },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }
      );
    }

    // Verify the 2FA code
    const isValid = verify2FACode(user.twoFA.secret, code);

    if (!isValid) {
      // Log failed attempt
      await LoginAttempt.create({ ip, email: tempUserId });
      return NextResponse.json(
        { error: "Invalid verification code" },
        {
          status: 401,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }
      );
    }

    // Update last seen
    user.lastSeen = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
    });

    const response = NextResponse.json(
      {
        message: "Two-factor authentication successful",
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          age: user.dateOfBirth
            ? new Date().getFullYear() - user.dateOfBirth.getFullYear()
            : null,
          gender: user.gender,
          location: user.location,
          bio: user.bio,
          interests: user.interests,
          photos: user.photos,
          isActive: user.isActive,
          lastSeen: user.lastSeen,
        },
        token,
      },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );

    // Set HttpOnly auth cookie for middleware protection on app routes
    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("2FA verification error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}
