import { NextRequest, NextResponse } from "next/server";
import { cryptoSubscriptionManager } from "@/lib/cryptoSubscriptionManager";
import connectToDatabase from "@/lib/mongodb";

const isAuthorizedCronRequest = (request: NextRequest): boolean => {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  return Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
};

const unauthorizedResponse = () =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });

const getSubscriptionStats = async () => {
  await connectToDatabase();

  const stats = await cryptoSubscriptionManager.getSubscriptionStats();

  return {
    status: "healthy",
    stats,
    timestamp: new Date().toISOString(),
  };
};

const processCryptoSubscriptions = async () => {
  await connectToDatabase();

  const startTime = Date.now();
  console.log("Starting crypto subscription processing...");

  const renewalResults =
    await cryptoSubscriptionManager.processPendingRenewals();

  await cryptoSubscriptionManager.checkExpiredPayments();
  await cryptoSubscriptionManager.monitorPendingTransactions();

  const stats = await cryptoSubscriptionManager.getSubscriptionStats();
  const processingTime = Date.now() - startTime;

  const result = {
    success: true,
    processingTime: `${processingTime}ms`,
    renewals: renewalResults,
    stats,
    timestamp: new Date().toISOString(),
  };

  console.log("Crypto subscription processing completed:", result);

  return result;
};

// Vercel Cron invokes GET requests. POST remains supported for manual runs.
export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const { searchParams } = new URL(request.url);

    if (searchParams.get("health") === "true") {
      return NextResponse.json(await getSubscriptionStats());
    }

    return NextResponse.json(await processCryptoSubscriptions());
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

export async function POST(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    return NextResponse.json(await processCryptoSubscriptions());
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
