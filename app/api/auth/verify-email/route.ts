import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import EmailVerification from '@/models/EmailVerification';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  await connectToDatabase();
  const code = request.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.json({ error: 'Verification code is required.' }, { status: 400 });
  }

  // Find verification record
  const verification = await EmailVerification.findOne({ code });
  if (!verification) {
    return NextResponse.json({ error: 'Invalid or expired verification code.' }, { status: 400 });
  }
  if (verification.verified) {
    return NextResponse.json({ message: 'Email already verified.' }, { status: 200 });
  }

  // Mark as verified
  verification.verified = true;
  await verification.save();

  // Update user
  await User.findByIdAndUpdate(verification.userId, {
    $set: { 'verification.isVerified': true, 'verification.verifiedAt': new Date() }
  });

  // Optionally, delete the verification record
  // await EmailVerification.deleteOne({ code });

  // Redirect to frontend success page
  return NextResponse.redirect(`${process.env.FRONTEND_ORIGIN || 'https://yourfrontend.com'}/verify-email-success`);
}
