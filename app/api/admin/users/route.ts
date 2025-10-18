import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import { logger } from "@/lib/logger";
import { Types } from "mongoose";

interface SearchQuery {
  $or?: Array<{ [key: string]: { $regex: string; $options: string } }>;
  "verification.isVerified"?: boolean;
  isActive?: boolean;
}

interface SortObject {
  [key: string]: 1 | -1;
}

interface UserData {
  _id: Types.ObjectId;
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
  createdAt: Date;
  updatedAt: Date;
  lastSeen?: Date;
  subscription?: { type?: string };
  isAdmin?: boolean;
  age?: number;
  fullName: string;
  reportCount: number;
  accountAge: number;
  lastActiveDays: number | null;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

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

    // Get query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const sortBy = url.searchParams.get("sortBy") || "createdAt";
    const sortOrder = url.searchParams.get("sortOrder") || "desc";
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "";

    // Build search query
    const searchQuery: SearchQuery = {};
    
    if (search) {
      searchQuery.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    if (status) {
      if (status === "active") {
        searchQuery["verification.isVerified"] = true;
        searchQuery.isActive = true;
      } else if (status === "unverified") {
        searchQuery["verification.isVerified"] = false;
      } else if (status === "suspended") {
        searchQuery.isActive = false;
      }
    }    // Calculate pagination
    const skip = (page - 1) * limit;

    // Build sort object
    const sortObj: SortObject = {};
    sortObj[sortBy] = sortOrder === "desc" ? -1 : 1;

    // Get users with pagination and additional data
    const [users, totalCount] = await Promise.all([
      User.aggregate([
        { $match: searchQuery },
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
        },
        { $sort: sortObj },
        { $skip: skip },
        { $limit: limit }
      ]),
      User.countDocuments(searchQuery)
    ]);

    console.log("Users count:", users.length, "Total count:", totalCount);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Ensure totalCount is a valid number
    const validTotalCount = isNaN(totalCount) ? 0 : totalCount;

    // Get user statistics
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          verifiedUsers: {
            $sum: { $cond: [{ $eq: ["$verification.isVerified", true] }, 1, 0] }
          },
          unverifiedUsers: {
            $sum: { $cond: [{ $eq: ["$verification.isVerified", false] }, 1, 0] }
          },
          suspendedUsers: {
            $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] }
          },
          adminUsers: {
            $sum: { $cond: [{ $eq: ["$isAdmin", true] }, 1, 0] }
          }
        }
      }
    ]);

    // Get recent registrations (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentRegistrations = await User.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });

    return NextResponse.json({
      users: users.map((user: UserData) => ({
        id: user._id.toString(),
        name: user.fullName,
        email: user.email,
        isVerified: user.verification?.isVerified || false,
        isAdmin: user.isAdmin || false,
        isSuspended: user.isActive === false,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastSeen,
        profileCompletion: calculateProfileCompletion(user),
        location: user.location?.city || "Not specified",
        age: user.age || calculateAge(user.dateOfBirth || null),
        status: getStatusFromUser(user),
        subscriptionType: user.subscription?.type || 'free',
        reportCount: user.reportCount || 0,
        accountAge: user.accountAge || 0,
        lastActiveDays: user.lastActiveDays,
        joinDate: user.createdAt,
        lastActive: user.lastSeen,
        subscription: {
          regular: user.subscription || { type: 'free' },
          crypto: user.subscription || { type: 'free' }
        }
      })),
      pagination: {
        page: page,
        currentPage: page,
        totalPages,
        total: validTotalCount,
        hasNext: hasNextPage,
        hasPrev: hasPreviousPage,
        limit
      },
      stats: stats[0] || {
        totalUsers: 0,
        verifiedUsers: 0,
        unverifiedUsers: 0,
        suspendedUsers: 0,
        adminUsers: 0
      },
      recentRegistrations
    });
  } catch (error) {
    logger.error("Error fetching admin users:", {
      action: "admin_get_users_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();

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
    const { userId, action, value } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { error: "User ID and action are required" },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
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
    if ((action === "suspend" || action === "ban") && userId === decoded.userId) {
      return NextResponse.json(
        { error: "You cannot suspend or ban yourself" },
        { status: 400 }
      );
    }

    // Handle different actions
    switch (action) {
      case "suspend":
      case "ban":
        user.isActive = value !== true; // If value is true, unsuspend; otherwise suspend
        break;
      case "verify":
        user.verification = user.verification || {};
        user.verification.isVerified = value !== false;
        if (value) {
          user.verification.verifiedAt = new Date();
        }
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
      message: `User ${action}ed successfully`,
      user: {
        id: user._id.toString(),
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        isVerified: user.verification?.isVerified || false,
        isAdmin: user.isAdmin || false,
        isSuspended: user.isActive === false,
        status: getStatusFromUser(user),
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    logger.error("Error updating user:", {
      action: "admin_update_user_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

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
    const { action, targetUserId, reason } = body;

    if (!targetUserId || !action) {
      return NextResponse.json(
        { error: "Target user ID and action are required" },
        { status: 400 }
      );
    }

    // Validate ObjectId
    if (!Types.ObjectId.isValid(targetUserId)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Prevent admins from acting on themselves
    if ((action === "suspend" || action === "ban") && targetUserId === decoded.userId) {
      return NextResponse.json(
        { error: "You cannot suspend or ban yourself" },
        { status: 400 }
      );
    }

    // Handle different actions
    switch (action) {
      case "suspend":
      case "ban":
        user.isActive = false;
        break;
      case "unsuspend":
      case "unban":
        user.isActive = true;
        break;
      case "verify":
        user.verification = user.verification || {};
        user.verification.isVerified = true;
        user.verification.verifiedAt = new Date();
        break;
      case "unverify":
        user.verification = user.verification || {};
        user.verification.isVerified = false;
        break;
      case "makeAdmin":
        user.isAdmin = true;
        break;
      case "removeAdmin":
        user.isAdmin = false;
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
        targetUserId: targetUserId,
        reason: reason || "No reason provided"
      }
    });

    return NextResponse.json({
      success: true,
      message: `User ${action}ed successfully`,
      user: {
        id: user._id.toString(),
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        isVerified: user.verification?.isVerified || false,
        isAdmin: user.isAdmin || false,
        isSuspended: user.isActive === false,
        status: getStatusFromUser(user),
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    logger.error("Error performing user action:", {
      action: "admin_user_action_failed",
      metadata: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
    return NextResponse.json(
      { error: "Failed to perform user action" },
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