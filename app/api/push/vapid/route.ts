import { NextResponse } from "next/server";
import { vapidKeys } from "@/lib/pushNotifications";

// Get VAPID public key for client-side push subscription
export async function GET() {
  try {
    return NextResponse.json({
      publicKey: vapidKeys.publicKey,
    });
  } catch (error) {
    console.error("Failed to get VAPID public key:", error);
    return NextResponse.json(
      { error: "Failed to get VAPID public key" },
      { status: 500 }
    );
  }
}
