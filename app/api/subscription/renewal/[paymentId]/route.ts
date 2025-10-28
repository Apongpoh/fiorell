import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import CryptoPayment from "@/models/CryptoPayment";
import { ObjectId } from "mongodb";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    await dbConnect();

    let authResult;
    try {
      authResult = verifyAuth(req);
    } catch {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    
    const userId = authResult.userId;
    const { paymentId } = await params;

    if (!ObjectId.isValid(paymentId)) {
      return NextResponse.json(
        { error: "Invalid payment ID" },
        { status: 400 }
      );
    }

    // Find the payment
    const payment = await CryptoPayment.findOne({
      _id: paymentId,
      userId: userId // Ensure user can only access their own payments
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Format the payment data for the frontend
    const formattedPayment = {
      id: payment._id.toString(),
      paymentReference: payment.paymentReference,
      cryptocurrency: payment.cryptocurrency,
      amount: payment.amount,
      amountUSD: payment.amountUSD,
      walletAddress: payment.walletAddress,
      status: payment.status,
      statusDisplay: payment.status.charAt(0).toUpperCase() + payment.status.slice(1).replace(/_/g, ' '),
      planType: payment.planType,
      planDuration: payment.planDuration,
      createdAt: payment.createdAt?.toISOString(),
      confirmedAt: payment.confirmedAt?.toISOString(),
      expiresAt: payment.expiresAt?.toISOString(),
      txid: payment.txid,
      confirmations: payment.confirmations,
      requiredConfirmations: payment.requiredConfirmations,
      isRenewal: true, // This endpoint is specifically for renewals
      proofOfPayment: payment.proofOfPayment
    };

    return NextResponse.json(formattedPayment);

  } catch (error) {
    console.error("Error fetching payment details for renewal:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}