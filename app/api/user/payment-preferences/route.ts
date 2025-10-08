import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyAuth } from "@/lib/auth";
import User from "@/models/User";

// Get user's payment preferences
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { userId } = verifyAuth(request);
    
    const user = await User.findById(userId).select('subscription.preferredPaymentMethod subscription.paymentMethod');
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      preferredPaymentMethod: user.subscription?.preferredPaymentMethod || "crypto",
      currentPaymentMethod: user.subscription?.paymentMethod,
    });
    
  } catch (error) {
    console.error("Get payment preferences error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Update user's payment preferences
export async function PUT(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { userId } = verifyAuth(request);
    const body = await request.json();
    
    const { preferredPaymentMethod } = body;
    
    if (!["crypto", "traditional"].includes(preferredPaymentMethod)) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      );
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      {
        "subscription.preferredPaymentMethod": preferredPaymentMethod,
      },
      { new: true }
    ).select('subscription.preferredPaymentMethod subscription.paymentMethod');
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      preferredPaymentMethod: user.subscription?.preferredPaymentMethod,
      currentPaymentMethod: user.subscription?.paymentMethod,
      message: "Payment preferences updated successfully",
    });
    
  } catch (error) {
    console.error("Update payment preferences error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}