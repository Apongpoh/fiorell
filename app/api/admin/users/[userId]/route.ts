import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import { logger } from "@/lib/logger";
import { Types } from "mongoose";

interface UserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  bio?: string;
  dateOfBirth?: Date;
  location?: { city?: string };
  interests?: string[];
  photos?: string[];
  lifestyle?: Record<string, unknown>;
  education?: { level?: string; field?: string };
  verification?: { isVerified?: boolean };
  isActive?: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  let userId = "";
  
  try {
    await connectDB();
    const resolvedParams = await params;
    userId = resolvedParams.userId;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    // Get auth token
    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify token and check admin status
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
    };
    const adminUser = await User.findById(decoded.userId);

    if (!adminUser || !adminUser.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get user with additional data
    const userResult = await User.aggregate([
      { $match: { _id: new Types.ObjectId(userId) } },
      {
        $lookup: {
          from: "reports",
          localField: "_id",
          foreignField: "reported",
          as: "reportsReceived"
        }
      },
      {
        $addFields: {
          reportCount: { $size: "$reportsReceived" },
          accountAge: {
            $floor: {
              $divide: [
                { $subtract: [new Date(), "$createdAt"] },
                1000 * 60 * 60 * 24
              ]
            }
          },
          lastActiveDays: {
            $cond: {
              if: { $ne: ["$lastSeen", null] },
              then: {
                $floor: {
                  $divide: [
                    { $subtract: [new Date(), "$lastSeen"] },
                    1000 * 60 * 60 * 24
                  ]
                }
              },
              else: null
            }
          },
          fullName: { $concat: ["$firstName", " ", "$lastName"] }
        }
      },
      {
        $project: {
          password: 0,
          __v: 0,
          reportsReceived: 0,
          resetPasswordToken: 0,
          resetPasswordExpires: 0,
          "twoFA.secret": 0,
          "twoFA.tempSecret": 0,
          "twoFA.recoveryCodes": 0
        }
      }
    ]);

    const userData = userResult[0];
    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: userData._id.toString(),
        name: userData.fullName,
        email: userData.email,
        isVerified: userData.verification?.isVerified || false,
        isAdmin: userData.isAdmin || false,
        isSuspended: userData.isActive === false,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
        lastLogin: userData.lastSeen,
        profileCompletion: calculateProfileCompletion(userData),
        location: userData.location?.city || "Not specified",
        age: userData.age || calculateAge(userData.dateOfBirth),
        bio: userData.bio,
        interests: userData.interests || [],
        photos: userData.photos || [],
        status: getStatusFromUser(userData),
        subscriptionType: userData.subscription?.type || 'free',
        reportCount: userData.reportCount || 0,
        accountAge: userData.accountAge || 0,
        lastActiveDays: userData.lastActiveDays,
        joinDate: userData.createdAt,
        lastActive: userData.lastSeen,
        subscription: {
          regular: userData.subscription || { type: 'free' },
          crypto: userData.subscription || { type: 'free' }
        },
        lifestyle: userData.lifestyle,
        education: userData.education,
        physicalAttributes: userData.physicalAttributes,
        preferences: userData.preferences,
        stats: userData.stats
      }
    });
  } catch (error) {
    logger.error("Error fetching admin user details:", {
      action: "admin_get_user_details_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        userId: userId || "unknown",
      },
    });
    return NextResponse.json(
      { error: "Failed to fetch user details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  let userId = "";
  
  try {
    await connectDB();
    const resolvedParams = await params;
    userId = resolvedParams.userId;

    // Validate ObjectId
    if (!Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    // Get auth token
    const token = request.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Verify token and check admin status
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
    };
    const adminUser = await User.findById(decoded.userId);

    if (!adminUser || !adminUser.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, value } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Prevent admins from suspending themselves
    if (action === "suspend" && userId === decoded.userId) {
      return NextResponse.json(
        { error: "You cannot suspend yourself" },
        { status: 400 }
      );
    }

    // Handle different actions
    switch (action) {
      case "suspend":
        user.isSuspended = value !== false;
        break;
      case "verify":
        user.isVerified = value !== false;
        break;
      case "makeAdmin":
        user.isAdmin = value !== false;
        break;
      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    user.updatedAt = new Date();
    await user.save();

    logger.info("Admin user action performed:", {
      action: `admin_user_${action}`,
      metadata: {
        adminId: decoded.userId,
        targetUserId: userId,
        actionValue: value
      }
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
        isSuspended: user.isSuspended || false,
        updatedAt: user.updatedAt,
        status: user.isSuspended ? 'suspended' : (user.isVerified ? 'active' : 'unverified')
      }
    });
  } catch (error) {
    logger.error("Error updating user:", {
      action: "admin_update_user_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
        userId: userId || "unknown",
      },
    });
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// Helper functions
function calculateProfileCompletion(user: UserData): number {
  let completed = 0;
  const total = 10; // Total fields to check

  if (user.firstName && user.lastName) completed++;
  if (user.email) completed++;
  if (user.bio) completed++;
  if (user.dateOfBirth) completed++;
  if (user.location?.city) completed++;
  if (user.interests && user.interests.length > 0) completed++;
  if (user.photos && user.photos.length > 0) completed++;
  if (user.lifestyle && Object.keys(user.lifestyle).length > 0) completed++;
  if (user.education && (user.education.level || user.education.field)) completed++;
  if (user.verification?.isVerified) completed++;

  return Math.round((completed / total) * 100);
}

function calculateAge(dateOfBirth: Date | null): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

function getStatusFromUser(user: UserData): 'active' | 'suspended' | 'unverified' | 'banned' {
  if (user.isActive === false) return 'suspended';
  if (!user.verification?.isVerified) return 'unverified';
  return 'active';
}