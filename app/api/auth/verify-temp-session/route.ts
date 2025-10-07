import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import logger from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { tempUserId } = body;

    if (!tempUserId) {
      return NextResponse.json(
        { error: "Temp user ID is required" },
        { status: 400 }
      );
    }

    // Find user by temp ID and verify they have 2FA enabled
    const user = await User.findById(tempUserId);
    if (!user || !user.twoFA?.enabled) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Session is valid
    return NextResponse.json({ valid: true });
  } catch (error) {
    logger.error("Temp session verification error:", {
      action: "temp_session_verification_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    },
  });
}
