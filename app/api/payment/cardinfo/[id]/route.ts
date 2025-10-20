import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyAuth } from "@/lib/auth";
import CardInfo from "@/models/CardInfo";

interface PaymentDocument {
  _id: string;
  sessionId: string;
  planId: string;
  planName: string;
  planInterval: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  isDemo: boolean;
  demoNote?: string;
  cardNumber?: string;
  cardholderName: string;
  expiryMonth: string;
  expiryYear: string;
  billingAddress: Record<string, unknown>;
  createdAt: Date;
  processedAt?: Date;
  userAgent: string;
  metadata?: {
    source?: string;
    processedBy?: string;
  };
}

// Get specific payment details by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    
    const { userId } = verifyAuth(request);
    const { id: paymentId } = await params;

    // Find payment and ensure it belongs to the requesting user
    const paymentResult = await CardInfo.findOne({
      _id: paymentId,
      userId: userId
    }).select("-cvc -metadata.sensitive").lean();

    if (!paymentResult) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Type assertion with proper handling
    const payment = paymentResult as unknown as PaymentDocument;

    // Format safe payment details
    const safePayment = {
      id: payment._id,
      sessionId: payment.sessionId,
      planId: payment.planId,
      planName: payment.planName,
      planInterval: payment.planInterval,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      isDemo: payment.isDemo,
      demoNote: payment.demoNote,
      
      // Safe card info
      cardInfo: {
        lastFour: payment.cardNumber ? payment.cardNumber.slice(-4) : "****",
        cardholderName: payment.cardholderName,
        expiryMonth: payment.expiryMonth,
        expiryYear: payment.expiryYear,
        // Never return full card number or CVC
      },
      
      // Billing address
      billingAddress: payment.billingAddress,
      
      // Timestamps
      createdAt: payment.createdAt,
      processedAt: payment.processedAt,
      
      // Safe metadata
      metadata: {
        userAgent: payment.userAgent,
        source: payment.metadata?.source,
        processedBy: payment.metadata?.processedBy
      }
    };

    return NextResponse.json({
      payment: safePayment
    });

  } catch (error) {
    console.error("Error fetching payment details:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment details" },
      { status: 500 }
    );
  }
}