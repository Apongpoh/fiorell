import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";
import Match from "@/models/Match";
import Message from "@/models/Message";
import jwt from "jsonwebtoken";

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authorization token required" },
        { status: 401 }
      );
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const { matchId } = await request.json();

    if (!matchId) {
      return NextResponse.json(
        { error: "Match ID is required" },
        { status: 400 }
      );
    }

    // Verify the match exists and user is part of it
    const match = await Match.findById(matchId);
    if (!match) {
      return NextResponse.json(
        { error: "Match not found" },
        { status: 404 }
      );
    }

    if (match.user1.toString() !== user._id.toString() && match.user2.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: "Unauthorized to clear this chat" },
        { status: 403 }
      );
    }

    // Clear messages for this user only (soft delete by adding user to hiddenFrom array)
    await Message.updateMany(
      { match: matchId },
      { 
        $addToSet: { 
          hiddenFrom: user._id 
        }
      }
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Clear chat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}