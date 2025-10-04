import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectToDatabase from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    
    if (!token) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    try {
      jwt.verify(token, JWT_SECRET) as { userId: string };
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { userId } = await params;
    
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    await connectToDatabase();
    
    // Get user's public key
    const user = await User.findById(userId).select("publicKey");
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!user.publicKey) {
      return NextResponse.json({ error: "User has no public key" }, { status: 404 });
    }

    return NextResponse.json({ 
      publicKey: user.publicKey 
    });

  } catch (error) {
    console.error("Error fetching public key:", error);
    return NextResponse.json(
      { error: "Failed to fetch public key" },
      { status: 500 }
    );
  }
}