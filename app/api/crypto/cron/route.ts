import { NextRequest, NextResponse } from "next/server";
import { cryptoSubscriptionManager } from "@/lib/cryptoSubscriptionManager";
import connectToDatabase from "@/lib/mongodb";

// Cron job endpoint for automated subscription processing
export async function POST(request: NextRequest) {
  try {
    // Verify cron job authentication
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    await connectToDatabase();
    
    const startTime = Date.now();
    console.log("Starting crypto subscription processing...");
    
    // Process subscription renewals
    const renewalResults = await cryptoSubscriptionManager.processPendingRenewals();
    
    // Check for expired payments
    await cryptoSubscriptionManager.checkExpiredPayments();
    
    // Monitor pending transactions
    await cryptoSubscriptionManager.monitorPendingTransactions();
    
    // Get updated statistics
    const stats = await cryptoSubscriptionManager.getSubscriptionStats();
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    const result = {
      success: true,
      processingTime: `${processingTime}ms`,
      renewals: renewalResults,
      stats,
      timestamp: new Date().toISOString(),
    };
    
    console.log("Crypto subscription processing completed:", result);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error("Cron job processing error:", error);
    return NextResponse.json(
      {
        error: "Processing failed",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET(_request: NextRequest) {
  try {
    await connectToDatabase();
    
    const stats = await cryptoSubscriptionManager.getSubscriptionStats();
    
    return NextResponse.json({
      status: "healthy",
      stats,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}