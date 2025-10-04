import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyAuth } from "@/lib/auth";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    const { userId } = verifyAuth(req);
    const user = (await User.findById(userId)
      .select("privacy")
      .lean()) as unknown as { privacy: unknown } | null;
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ privacy: user.privacy }, { status: 200 });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "message" in error) {
      const msg = (error as { message: string }).message;
      if (
        msg.includes("Invalid or expired token") ||
        msg.includes("Authentication token")
      ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectToDatabase();
    const { userId } = verifyAuth(req);
    const body = await req.json();
    const { showAge, showLocation, onlineStatus, readReceipts, visibility } =
      body || {};

    const update: Record<string, unknown> = {};
    if (typeof showAge === "boolean") update["privacy.showAge"] = showAge;
    if (typeof showLocation === "boolean")
      update["privacy.showLocation"] = showLocation;
    if (typeof onlineStatus === "boolean")
      update["privacy.onlineStatus"] = onlineStatus;
    if (typeof readReceipts === "boolean")
      update["privacy.readReceipts"] = readReceipts;
    if (typeof visibility === "string")
      update["privacy.visibility"] = visibility;

    const updated = (await User.findByIdAndUpdate(
      userId,
      { $set: update },
      { new: true }
    )
      .select("privacy")
      .lean()) as unknown as { privacy: unknown } | null;
    if (!updated)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({ privacy: updated.privacy }, { status: 200 });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "message" in error) {
      const msg = (error as { message: string }).message;
      if (
        msg.includes("Invalid or expired token") ||
        msg.includes("Authentication token")
      ) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
