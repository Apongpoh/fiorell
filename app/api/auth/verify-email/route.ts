import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import EmailVerification from "@/models/EmailVerification";
import User from "@/models/User";
import { z } from "zod";

const verifyEmailSchema = z.object({
  code: z.string().min(1, "Verification code is required"),
  email: z.string().email("Please enter a valid email address"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, email } = verifyEmailSchema.parse(body);

    await connectToDatabase();

    const verification = await EmailVerification.findOne({
      code,
      email: email.toLowerCase(),
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 400 }
      );
    }

    if (verification.verified) {
      return NextResponse.json({
        message: "Email verified successfully! You can now sign in.",
      });
    }

    // Check if verification is expired (24 hours)
    const now = new Date();
    const verificationAge = now.getTime() - verification.createdAt.getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (verificationAge > maxAge) {
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Mark verification as completed
    await EmailVerification.findByIdAndUpdate(verification._id, {
      verified: true,
    });

    // Update user's email verification status
    await User.findByIdAndUpdate(verification.userId, {
      "verification.isVerified": true,
      "verification.verifiedAt": new Date(),
    });

    return NextResponse.json({
      message: "Email verified successfully! You can now sign in.",
    });
  } catch (error) {
    console.error("Email verification error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "An error occurred during verification. Please try again." },
      { status: 500 }
    );
  }
}

// Keep the existing GET route for backward compatibility
export async function GET(request: NextRequest) {
  await connectToDatabase();
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json(
      { error: "Verification code is required." },
      { status: 400 }
    );
  }

  // Find verification record
  const verification = await EmailVerification.findOne({ code });
  if (!verification) {
    return NextResponse.json(
      { error: "Invalid or expired verification code." },
      { status: 400 }
    );
  }
  if (verification.verified) {
    return NextResponse.json(
      { message: "Email already verified." },
      { status: 200 }
    );
  }

  // Mark as verified
  verification.verified = true;
  await verification.save();

  // Update user
  await User.findByIdAndUpdate(verification.userId, {
    $set: {
      "verification.isVerified": true,
      "verification.verifiedAt": new Date(),
    },
  });

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login?verified=true`
  );
}
