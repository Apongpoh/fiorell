import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyAuth } from "@/lib/auth";
import Report from "@/models/Report";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { userId } = verifyAuth(req);
    const body = await req.json();
    const { targetUserId, reason } = body || {};

    if (!targetUserId || typeof targetUserId !== "string") {
      return NextResponse.json({ error: "targetUserId is required" }, { status: 400 });
    }
    if (targetUserId === userId) {
      return NextResponse.json({ error: "You cannot report yourself" }, { status: 400 });
    }

    const report = await Report.create({ reporter: userId, reported: targetUserId, reason: String(reason || "") });

    return NextResponse.json({ message: "Report submitted", report }, { status: 200 });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      ((error as { message: string }).message === "Authentication token is required" ||
        (error as { message: string }).message === "Invalid or expired token")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
