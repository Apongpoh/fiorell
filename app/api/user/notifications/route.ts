import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import User from "@/models/User";
import connectToMongoDB from "@/lib/mongodb";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Get user notification preferences
export async function GET(request: NextRequest) {
  try {
    await connectToMongoDB();

    // Get token from Authorization header or query parameter
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "") || request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    // Find user
    const user = await User.findById(decoded.userId).select("notificationSettings");
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return notification settings with defaults if not set
    const defaultSettings = {
      matches: { push: true, email: true, sound: true },
      messages: { push: true, email: false, sound: true },
      likes: { push: true, email: false, sound: false },
      views: { push: false, email: true, sound: false },
      quietHours: {
        enabled: false,
        startTime: "22:00",
        endTime: "08:00"
      }
    };

    const settings = user.notificationSettings || defaultSettings;

    return NextResponse.json({ settings });
  } catch (error: unknown) {
    console.error("Get notification settings error:", error);
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to get notification settings" },
      { status: 500 }
    );
  }
}

// Update user notification preferences
export async function PUT(request: NextRequest) {
  try {
    await connectToMongoDB();

    // Get token from Authorization header
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    // Parse request body
    const { settings } = await request.json();

    if (!settings) {
      return NextResponse.json({ error: "Settings are required" }, { status: 400 });
    }

    // Update user notification settings
    const user = await User.findByIdAndUpdate(
      decoded.userId,
      { 
        $set: { 
          notificationSettings: settings,
          updatedAt: new Date()
        }
      },
      { new: true }
    ).select("notificationSettings");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      message: "Notification preferences updated successfully",
      settings: user.notificationSettings
    });
  } catch (error: unknown) {
    if (error instanceof jwt.JsonWebTokenError) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to update notification settings" },
      { status: 500 }
    );
  }
}