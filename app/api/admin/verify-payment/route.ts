import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import CryptoPayment from "@/models/CryptoPayment";
import User from "@/models/User";
import { verifyAuth } from "@/lib/auth";
import { activateSubscription } from "@/lib/subscriptionActivation";

interface AdminVerificationRequest {
  paymentId: string;
  status: "approved" | "rejected";
  notes?: string;
  blockchainVerified?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Authenticate user
    let payload;
    try {
      payload = verifyAuth(request);
    } catch {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const adminUser = await User.findById(payload.userId);
    if (!adminUser || adminUser.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body: AdminVerificationRequest = await request.json();

    // Validate required fields
    if (!body.paymentId || !body.status) {
      return NextResponse.json(
        { error: "Payment ID and status are required" },
        { status: 400 }
      );
    }

    if (!["approved", "rejected"].includes(body.status)) {
      return NextResponse.json(
        { error: "Status must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    // Find the payment that needs verification
    const payment = await CryptoPayment.findOne({
      paymentId: body.paymentId,
      status: { $in: ["user_confirmed", "admin_verifying"] }
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found or not ready for verification" },
        { status: 404 }
      );
    }

    // Update payment status using the model method
    await payment.setAdminVerification(
      payload.userId,
      body.status,
      body.notes,
      body.blockchainVerified || false
    );

    // If approved, activate the subscription
    if (body.status === "approved") {
      const activationResult = await activateSubscription({
        userId: payment.userId,
        planType: payment.planType,
        planDuration: payment.planDuration,
        cryptocurrency: payment.cryptocurrency,
        isRecurring: payment.isRecurring
      });

      if (!activationResult.success) {
        console.error("Failed to activate subscription:", activationResult.message);
        // Don't fail the verification if subscription activation fails
        // The payment is still approved, admin can manually fix subscription
      }
    }

    return NextResponse.json({
      success: true,
      message: `Payment ${body.status} successfully`,
      payment: {
        paymentId: payment.paymentId,
        paymentReference: payment.paymentReference,
        status: payment.status,
        statusDisplay: payment.statusDisplay,
        adminVerification: payment.adminVerification,
        adminVerifiedAt: payment.adminVerifiedAt,
        confirmedAt: payment.confirmedAt
      }
    });

  } catch (error) {
    console.error("Admin verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to list payments pending verification
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    // Authenticate user
    let payload;
    try {
      payload = verifyAuth(request);
    } catch {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const adminUser = await User.findById(payload.userId);
    if (!adminUser || adminUser.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "user_confirmed";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Find payments that need verification
    const query: {
      status?: string | { $in: string[] };
    } = {};
    
    if (status === "pending_verification") {
      query.status = { $in: ["user_confirmed", "admin_verifying"] };
    } else {
      query.status = status;
    }

    const payments = await CryptoPayment.find(query)
      .populate("userId", "email username displayName createdAt")
      .sort({ userConfirmedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await CryptoPayment.countDocuments(query);

    // Format payment data for admin view
    const formattedPayments = payments.map(payment => ({
      paymentId: payment.paymentId,
      paymentReference: payment.paymentReference,
      user: {
        id: payment.userId._id,
        email: payment.userId.email,
        username: payment.userId.username,
        displayName: payment.userId.displayName,
        memberSince: payment.userId.createdAt
      },
      cryptocurrency: payment.cryptocurrency,
      amount: payment.amount,
      amountUSD: payment.amountUSD,
      expectedAmountSat: payment.expectedAmountSat,
      planType: payment.planType,
      planDuration: payment.planDuration,
      status: payment.status,
      statusDisplay: payment.statusDisplay,
      userProof: payment.userProof ? {
        transactionHash: payment.userProof.transactionHash,
        fromAddress: payment.userProof.fromAddress,
        amount: payment.userProof.amount,
        submittedAt: payment.userProof.submittedAt,
        notes: payment.userProof.notes,
        screenshot: payment.userProof.screenshot
      } : null,
      adminVerification: payment.adminVerification,
      createdAt: payment.createdAt,
      userConfirmedAt: payment.userConfirmedAt,
      adminVerifiedAt: payment.adminVerifiedAt,
      confirmedAt: payment.confirmedAt,
      expiresAt: payment.expiresAt
    }));

    return NextResponse.json({
      payments: formattedPayments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error("Admin payment list error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}