import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import CryptoPayment from "@/models/CryptoPayment";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    await connectToDatabase();
    
    // Get user's payment history, sorted by most recent first
    const payments = await CryptoPayment.find({ userId: decoded.userId })
      .sort({ createdAt: -1 })
      .limit(50) // Limit to last 50 payments
      .lean()
      .exec();

    // Format payment data for frontend
    const formattedPayments = payments.map((payment: any) => ({
      paymentId: payment._id?.toString() || payment.id,
      paymentReference: payment.paymentReference,
      cryptocurrency: payment.cryptocurrency,
      amount: payment.amount,
      amountUSD: payment.amountUSD,
      status: payment.status,
      statusDisplay: getStatusDisplay(payment.status),
      planType: payment.planType,
      planDuration: payment.planDuration,
      createdAt: payment.createdAt.toISOString(),
      confirmedAt: payment.confirmedAt?.toISOString(),
      expiresAt: payment.expiresAt.toISOString(),
      userProof: payment.userProof ? {
        transactionHash: payment.userProof.transactionHash,
        amount: payment.userProof.amount,
        submittedAt: payment.userProof.submittedAt.toISOString(),
        notes: payment.userProof.notes,
      } : undefined,
      adminVerification: payment.adminVerification ? {
        status: payment.adminVerification.status,
        verifiedAt: payment.adminVerification.verifiedAt.toISOString(),
        notes: payment.adminVerification.notes,
      } : undefined,
    }));

    return NextResponse.json({
      success: true,
      payments: formattedPayments,
      total: formattedPayments.length,
    });

  } catch (error) {
    console.error("Error fetching payment history:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function getStatusDisplay(status: string): string {
  switch (status) {
    case "pending":
      return "Waiting for Payment";
    case "user_confirmed":
      return "Proof Submitted";
    case "admin_verifying":
      return "Being Verified";
    case "confirmed":
      return "Payment Confirmed";
    case "failed":
      return "Payment Failed";
    case "expired":
      return "Payment Expired";
    default:
      return "Unknown Status";
  }
}