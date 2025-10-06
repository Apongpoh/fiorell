import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import EmailVerification from "@/models/EmailVerification";
import { sendVerificationEmail } from "@/lib/sendVerificationEmail";

export async function POST(request: NextRequest) {
  await connectToDatabase();
  const { email } = await request.json();
  if (!email) {
    return NextResponse.json(
      {
        message:
          "If an account exists for this email, a verification email has been sent.",
      },
      { status: 200 }
    );
  }

  // Rate limit: only allow resend every 5 minutes per email
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const recentVerification = await EmailVerification.findOne({
    email: email.toLowerCase(),
    createdAt: { $gte: fiveMinutesAgo },
  });
  if (recentVerification) {
    return NextResponse.json(
      {
        message:
          "If an account exists for this email, a verification email has been sent.",
      },
      { status: 200 }
    );
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || user.verification?.isVerified) {
    // Always return generic message
    return NextResponse.json(
      {
        message:
          "If an account exists for this email, a verification email has been sent.",
      },
      { status: 200 }
    );
  }

  // Generate new code
  const verificationCode =
    Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  await EmailVerification.findOneAndUpdate(
    { userId: user._id.toString() },
    {
      code: verificationCode,
      verified: false,
      createdAt: new Date(),
      email: user.email,
    },
    { upsert: true }
  );
  await sendVerificationEmail(user.email, verificationCode);

  return NextResponse.json(
    {
      message:
        "If an account exists for this email, a verification email has been sent.",
    },
    { status: 200 }
  );
}
