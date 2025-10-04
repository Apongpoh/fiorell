import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyAuth } from "@/lib/auth";
import User from "@/models/User";
import Like from "@/models/Like";
import Match from "@/models/Match";
import Message from "@/models/Message";
import Block from "@/models/Block";
import Report from "@/models/Report";
import SupportTicket from "@/models/SupportTicket";
import ProfileView from "@/models/ProfileView";
import Interaction from "@/models/Interaction";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { userId } = verifyAuth(req);
    const body = await req.json();
    const { confirmName, hardDelete } = (body || {}) as {
      confirmName?: string;
      hardDelete?: boolean;
    };

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

    if (hardDelete) {
      // Hard delete: remove user and related records
      try {
        // Delete relationships and artifacts referencing the user
        await Promise.all([
          Like.deleteMany({
            $or: [{ fromUserId: userId }, { toUserId: userId }],
          }),
          Match.deleteMany({ $or: [{ user1: userId }, { user2: userId }] }),
          Message.deleteMany({
            $or: [{ sender: userId }, { recipient: userId }],
          }),
          Block.deleteMany({ $or: [{ blocker: userId }, { blocked: userId }] }),
          Report.deleteMany({
            $or: [{ reporter: userId }, { reported: userId }],
          }),
          SupportTicket.deleteMany({ userId }),
          ProfileView.deleteMany({
            $or: [{ viewer: userId }, { viewed: userId }],
          }),
          Interaction.deleteMany({
            $or: [{ fromUserId: userId }, { toUserId: userId }],
          }),
        ]);
        await User.deleteOne({ _id: userId });
        return NextResponse.json(
          { message: "Account deleted permanently" },
          { status: 200 }
        );
      } catch {
        return NextResponse.json(
          { error: "Failed to delete account permanently" },
          { status: 500 }
        );
      }
    } else {
      // Soft delete: deactivate account
      user.isActive = false;
      await user.save();

      // Optionally, clear PII or mark for purge (not deleting here to avoid cascades)
      // TODO: schedule purge job or anonymize more fields

      return NextResponse.json(
        { message: "Account deactivated" },
        { status: 200 }
      );
    }
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
