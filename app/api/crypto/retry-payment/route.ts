import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import CryptoPayment from "@/models/CryptoPayment";
import { verifyAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const { userId } = verifyAuth(request);
    const body = await request.json();

    const { paymentId, reason } = body;

    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment ID is required" },
        { status: 400 }
      );
    }

    // Find the original payment
    const originalPayment = await CryptoPayment.findOne({
      paymentId,
      userId,
    });

    if (!originalPayment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Only allow retry for failed or expired payments
    if (!["failed", "expired"].includes(originalPayment.status)) {
      return NextResponse.json(
        { error: "Only failed or expired payments can be retried" },
        { status: 400 }
      );
    }

    // Create a retry payment request to the main payment API
    const retryPaymentResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/crypto/payment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: request.headers.get("Authorization") || "",
      },
      body: JSON.stringify({
        cryptocurrency: originalPayment.cryptocurrency,
        planType: originalPayment.planType,
        planDuration: originalPayment.planDuration,
        isRecurring: originalPayment.isRecurring,
        paymentType: "retry",
        previousPaymentId: originalPayment.paymentId,
      }),
    });

    if (!retryPaymentResponse.ok) {
      const errorData = await retryPaymentResponse.json();
      return NextResponse.json(
        { error: errorData.error || "Failed to create retry payment" },
        { status: retryPaymentResponse.status }
      );
    }

    const retryPaymentData = await retryPaymentResponse.json();

    // Update original payment with retry information
    originalPayment.metadata = {
      ...originalPayment.metadata,
      retryReason: reason || "User initiated retry",
      retriedAt: new Date().toISOString(),
      retryPaymentId: retryPaymentData.payment.paymentId,
    };
    await originalPayment.save();

    return NextResponse.json({
      success: true,
      message: "Retry payment created successfully",
      originalPayment: {
        paymentId: originalPayment.paymentId,
        paymentReference: originalPayment.paymentReference,
        status: originalPayment.status,
      },
      retryPayment: retryPaymentData.payment,
    });

  } catch (error) {
    console.error("Payment retry error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();

    const { userId } = verifyAuth(request);
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get("paymentId");

    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment ID is required" },
        { status: 400 }
      );
    }

    // Find the payment and check if it can be retried
    const payment = await CryptoPayment.findOne({
      paymentId,
      userId,
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    const canRetry = ["failed", "expired"].includes(payment.status);
    const hasBeenRetried = payment.metadata?.retryPaymentId ? true : false;

    return NextResponse.json({
      payment: {
        paymentId: payment.paymentId,
        paymentReference: payment.paymentReference,
        status: payment.status,
        statusDisplay: payment.statusDisplay,
        canRetry,
        hasBeenRetried,
        retryPaymentId: payment.metadata?.retryPaymentId || null,
        expiresAt: payment.expiresAt,
        createdAt: payment.createdAt,
      },
    });

  } catch (error) {
    console.error("Payment retry check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}