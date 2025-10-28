import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import CryptoPayment from "@/models/CryptoPayment";
import { verifyAuth } from "@/lib/auth";

interface PaymentConfirmationRequest {
  paymentReference: string;
  transactionHash: string;
  fromAddress?: string;
  amount: number;
  screenshot?: string; // Base64 encoded image or file URL
  notes?: string;
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

    const userId = payload.userId;
    const body: PaymentConfirmationRequest = await request.json();

    // Validate required fields
    if (!body.paymentReference || !body.transactionHash || !body.amount) {
      return NextResponse.json(
        { error: "Payment reference, transaction hash, and amount are required" },
        { status: 400 }
      );
    }

    // Validate transaction hash format (basic check)
    if (!/^[a-fA-F0-9]{64}$/.test(body.transactionHash)) {
      return NextResponse.json(
        { error: "Invalid transaction hash format" },
        { status: 400 }
      );
    }

    // Find the payment by reference and user
    const payment = await CryptoPayment.findOne({
      paymentReference: body.paymentReference,
      userId: userId,
      status: "pending"
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found or already processed" },
        { status: 404 }
      );
    }

    // Check if payment has expired
    if (payment.isExpired()) {
      payment.status = "expired";
      await payment.save();
      return NextResponse.json(
        { error: "Payment has expired" },
        { status: 400 }
      );
    }

    // Check if user has already submitted proof
    if (payment.userProof && payment.userProof.transactionHash) {
      return NextResponse.json(
        { error: "Payment proof already submitted" },
        { status: 400 }
      );
    }

    // Submit user proof using the model method
    await payment.submitUserProof({
      transactionHash: body.transactionHash,
      fromAddress: body.fromAddress,
      amount: body.amount,
      screenshot: body.screenshot,
      notes: body.notes
    });

    // Return success response with updated payment status
    return NextResponse.json({
      success: true,
      message: "Payment proof submitted successfully",
      payment: {
        paymentId: payment.paymentId,
        paymentReference: payment.paymentReference,
        status: payment.status,
        statusDisplay: payment.statusDisplay,
        submittedAt: payment.userConfirmedAt
      }
    });

  } catch (error) {
    console.error("Payment confirmation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to check payment status
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

    const userId = payload.userId;
    const { searchParams } = new URL(request.url);
    const paymentReference = searchParams.get("reference");

    if (!paymentReference) {
      return NextResponse.json(
        { error: "Payment reference is required" },
        { status: 400 }
      );
    }

    // Find the payment by reference and user
    const payment = await CryptoPayment.findOne({
      paymentReference: paymentReference,
      userId: userId
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Return payment status and details
    return NextResponse.json({
      payment: {
        paymentId: payment.paymentId,
        paymentReference: payment.paymentReference,
        cryptocurrency: payment.cryptocurrency,
        amount: payment.amount,
        amountUSD: payment.amountUSD,
        expectedAmountSat: payment.expectedAmountSat,
        toAddress: payment.toAddress,
        status: payment.status,
        statusDisplay: payment.statusDisplay,
        planType: payment.planType,
        planDuration: payment.planDuration,
        expiresAt: payment.expiresAt,
        userProof: payment.userProof ? {
          transactionHash: payment.userProof.transactionHash,
          amount: payment.userProof.amount,
          submittedAt: payment.userProof.submittedAt,
          notes: payment.userProof.notes
        } : null,
        adminVerification: payment.adminVerification ? {
          status: payment.adminVerification.status,
          verifiedAt: payment.adminVerification.verifiedAt,
          notes: payment.adminVerification.notes
        } : null,
        createdAt: payment.createdAt,
        userConfirmedAt: payment.userConfirmedAt,
        adminVerifiedAt: payment.adminVerifiedAt,
        confirmedAt: payment.confirmedAt
      }
    });

  } catch (error) {
    console.error("Payment status check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}