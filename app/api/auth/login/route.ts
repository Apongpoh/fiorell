import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { generateToken } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

// CORS preflight handler (no request body needed)
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

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid login details" },
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

    const { email, password } = parsed.data;

    // Rate limiting: max 5 failed login attempts per IP+email per 15 minutes
    const LoginAttempt = (await import("@/models/LoginAttempt")).default;
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentAttempts = await LoginAttempt.countDocuments({
      ip,
      email,
      createdAt: { $gte: fifteenMinutesAgo },
    });
    if (recentAttempts >= 5) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
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

    const recordFailedAttempt = () => LoginAttempt.create({ ip, email });

    // Find user by email
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      await recordFailedAttempt();
      logger.security("Login attempt - user not found", {
        action: "login_user_not_found",
        metadata: { email },
      });
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

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      await recordFailedAttempt();
      return NextResponse.json(
        { error: "Incorrect password" },
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

    // Check if email is verified
    if (!user.verification?.isVerified) {
      return NextResponse.json(
        {
          error:
            "Please verify your email address before signing in. Check your inbox for a verification email.",
          requiresVerification: true,
          email: user.email,
        },
        {
          status: 403,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }
      );
    }

    // Check if user account is suspended/banned
    if (user.isActive === false) {
      logger.security("Login attempt - suspended user", {
        action: "login_suspended_user",
        metadata: { 
          email,
          userId: user._id.toString() 
        },
      });
      return NextResponse.json(
        {
          error: "Your account has been suspended. Please contact support for assistance.",
          accountSuspended: true,
        },
        {
          status: 403,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        }
      );
    }

    // Check if user has 2FA enabled
    if (user.twoFA?.enabled) {
      await LoginAttempt.deleteMany({ ip, email });
      // If 2FA is enabled, don't generate full token yet
      // Return a temporary response indicating 2FA is required
      return NextResponse.json(
        {
          requiresTwoFA: true,
          message: "Two-factor authentication required",
          tempUserId: user._id.toString(),
          expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes expiry
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
    }

    // Update last seen
    user.lastSeen = new Date();
    await user.save();
    await LoginAttempt.deleteMany({ ip, email });

    // Generate JWT token
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
    });

    const response = NextResponse.json(
      {
        message: "Login successful",
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
          isAdmin: user.isAdmin,
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
    logger.error("Login error", {
      action: "login_error",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
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
