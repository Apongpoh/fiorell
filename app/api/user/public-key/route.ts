import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { publicKey } = await request.json();

    if (!publicKey || typeof publicKey !== "string") {
      return NextResponse.json(
        { error: "Public key is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Update user's public key
    await User.findByIdAndUpdate(decoded.userId, {
      publicKey: publicKey,
      publicKeyUpdatedAt: new Date(),
    });

    return NextResponse.json({
      message: "Public key updated successfully",
    });
  } catch (error) {
    console.error("Error updating public key:", error);
    return NextResponse.json(
      { error: "Failed to update public key" },
      { status: 500 }
    );
  }
}
