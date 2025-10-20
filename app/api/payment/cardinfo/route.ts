import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyAuth } from "@/lib/auth";
import CardInfo from "@/models/CardInfo";
import User from "@/models/User";

// Save payment information (demo mode)
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { userId } = verifyAuth(request);
    const {
      sessionId,
      planId,
      cardNumber,
      expiryMonth,
      expiryYear,
      cvc,
      cardholderName,
      billingAddress,
      amount,
      currency,
      planName,
      planInterval,
      userAgent,
      ipAddress
    } = await request.json();

    // Validate required fields
    if (!sessionId || !planId || !cardNumber || !expiryMonth || !expiryYear || !cvc || !cardholderName) {
      return NextResponse.json(
        { error: "Missing required payment information" },
        { status: 400 }
      );
    }

    // Get user info
    const user = await User.findById(userId).select("firstName lastName email");
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if session already exists
    const existingCard = await CardInfo.findOne({ sessionId });
    if (existingCard) {
      return NextResponse.json(
        { error: "Payment session already processed" },
        { status: 409 }
      );
    }

    // Get client IP (simplified for demo)
    const clientIP = ipAddress || 
      request.headers.get("x-forwarded-for")?.split(",")[0] || 
      request.headers.get("x-real-ip") || 
      "unknown";

    // Create card info record
    const cardInfo = new CardInfo({
      userId,
      sessionId,
      planId,
      
      // Card details (in demo mode, these are stored as-is)
      cardNumber: cardNumber.replace(/\s/g, ""), // Remove spaces
      expiryMonth: expiryMonth.padStart(2, "0"), // Ensure 2 digits
      expiryYear,
      cvc,
      cardholderName: cardholderName.trim(),
      
      // Billing address (optional)
      billingAddress: billingAddress || {},
      
      // Payment details
      amount: parseFloat(amount),
      currency: currency || "USD",
      planName,
      planInterval,
      
      // Transaction details
      status: "pending", // Will be updated to "completed" after processing
      paymentMethod: "demo",
      isDemo: true,
      demoNote: "Demo transaction - no real payment processed",
      
      // Metadata
      userAgent: userAgent || request.headers.get("user-agent") || "unknown",
      ipAddress: clientIP,
      metadata: {
        userEmail: user.email,
        userName: `${user.firstName} ${user.lastName}`,
        timestamp: new Date().toISOString(),
        source: "placeholder_checkout"
      }
    });

    // Save to database
    await cardInfo.save();

    // Simulate processing delay (like real payment processor)
    setTimeout(async () => {
      try {
        await CardInfo.findByIdAndUpdate(cardInfo._id, {
          status: "completed",
          processedAt: new Date(),
          "metadata.processedBy": "demo_processor"
        });
      } catch (error) {
        console.error("Error updating payment status:", error);
      }
    }, 3000); // 3 second delay

    // Return safe card info
    const safeCardInfo = cardInfo.getSafeCardInfo();

    return NextResponse.json({
      success: true,
      paymentId: cardInfo._id,
      sessionId: cardInfo.sessionId,
      cardInfo: safeCardInfo,
      message: "Payment information saved successfully"
    });

  } catch (error) {
    console.error("Error saving payment information:", error);
    return NextResponse.json(
      { error: "Failed to save payment information" },
      { status: 500 }
    );
  }
}

// Get user's payment history
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { userId } = verifyAuth(request);
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get payment history
    const payments = await CardInfo.find({ userId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .select("-cvc -metadata.sensitive") // Never return sensitive data
      .lean();

    // Get total count
    const totalCount = await CardInfo.countDocuments({ userId });

    // Format response
    const formattedPayments = payments.map(payment => ({
      id: payment._id,
      sessionId: payment.sessionId,
      planName: payment.planName,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      isDemo: payment.isDemo,
      lastFour: payment.cardNumber ? payment.cardNumber.slice(-4) : "****",
      createdAt: payment.createdAt,
      processedAt: payment.processedAt
    }));

    return NextResponse.json({
      payments: formattedPayments,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    });

  } catch (error) {
    console.error("Error fetching payment history:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment history" },
      { status: 500 }
    );
  }
}