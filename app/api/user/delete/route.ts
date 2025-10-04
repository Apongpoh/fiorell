import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyAuth } from "@/lib/auth";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { userId } = verifyAuth(req);
    const body = await req.json();
    const { confirmName } = body || {};

    if (!confirmName || typeof confirmName !== "string") {
      return NextResponse.json(
        { error: "Confirmation name is required" },
        { status: 400 }
      );
    }

    const user = await User.findById(userId).select("firstName isActive email");
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const matches =
      user.firstName.trim().toLowerCase() === confirmName.trim().toLowerCase();
    if (!matches) {
      return NextResponse.json(
        { error: "Confirmation name does not match" },
        { status: 400 }
      );
    }

    // Soft delete: deactivate account
    user.isActive = false;
    await user.save();

    // Optionally, clear PII or mark for purge (not deleting here to avoid cascades)
    // TODO: schedule purge job or anonymize more fields

    return NextResponse.json(
      { message: "Account deactivated" },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      ((error as { message: string }).message ===
        "Authentication token is required" ||
        (error as { message: string }).message === "Invalid or expired token")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
