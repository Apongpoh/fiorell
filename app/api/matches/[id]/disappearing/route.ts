import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Match from "@/models/Match";
import { verifyAuth } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { userId } = verifyAuth(request);
    const { id } = await context.params;
    const matchId = id;
    const body = await request.json();
    const { disappearingMessageDuration } = body;

    if (!matchId || typeof disappearingMessageDuration !== "number") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const match = await Match.findOne({
      _id: matchId,
      $or: [{ user1: userId }, { user2: userId }],
      status: "matched",
      isActive: true,
    });
    if (!match) {
      return NextResponse.json(
        { error: "Match not found or unauthorized" },
        { status: 404 }
      );
    }

    match.disappearingMessageDuration = disappearingMessageDuration;
    await match.save();

    return NextResponse.json({ success: true, disappearingMessageDuration });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
