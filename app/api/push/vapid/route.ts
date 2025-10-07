import { NextResponse } from "next/server";
import { vapidKeys } from "@/lib/pushNotifications";
import logger from "@/lib/logger";

// Get VAPID public key for client-side push subscription
export async function GET() {
  try {
    return NextResponse.json({
      publicKey: vapidKeys.publicKey,
    });
  } catch (error) {
    logger.error("Failed to get VAPID public key:", {
      action: "get_vapid_public_key_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return NextResponse.json(
      { error: "Failed to get VAPID public key" },
      { status: 500 }
    );
  }
}
