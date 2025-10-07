import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import { z } from "zod";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/sendPasswordResetEmail";
import { logger } from "@/lib/logger";

// Schema for request body validation

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    await connectToDatabase();

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration attacks
    // But only send email if user exists
    if (user) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      // Save reset token to user
      await User.findByIdAndUpdate(user._id, {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetTokenExpiry,
      });

      // Send password reset email
      try {
        await sendPasswordResetEmail(email, resetToken);
      } catch (emailError) {
        logger.error("Failed to send password reset email:", {
          action: "forgot_password_send_email_failed",
          metadata: {
            error:
              emailError instanceof Error
                ? emailError.message
                : String(emailError),
          },
        });
        // Don't expose email sending failures to client
      }
    }

    return NextResponse.json({
      message:
        "If an account with that email exists, we've sent a password reset link.",
    });
  } catch (error) {
    logger.error("Forgot password error:", {
      action: "forgot_password_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "An error occurred. Please try again." },
      { status: 500 }
    );
  }
}
