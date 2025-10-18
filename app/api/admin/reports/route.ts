import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Report from "@/models/Report";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";

interface FilterQuery {
  status?: string;
  type?: string;
}

interface SortQuery {
  [key: string]: 1 | -1;
}

interface PopulatedUser {
  _id: string;
  name: string;
  email: string;
  profilePicture?: string;
  isActive?: boolean;
}

interface PopulatedReport {
  _id: string;
  type: string;
  reason: string;
  description?: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  reportedBy?: PopulatedUser;
  reportedUser?: PopulatedUser;
}

interface AggregationStat {
  _id: string;
  count: number;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Verify admin authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const adminUser = await User.findById(decoded.userId);
    if (!adminUser || !adminUser.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build filter
    const filter: FilterQuery = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (type) {
      filter.type = type;
    }

    // Build sort
    const sort: SortQuery = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const skip = (page - 1) * limit;

    // Get reports with user information
    const [reports, totalReports] = await Promise.all([
      Report.find(filter)
        .populate('reportedBy', 'name email profilePicture')
        .populate('reportedUser', 'name email profilePicture isActive')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Report.countDocuments(filter)
    ]);

    // Format reports
    const formattedReports = (reports as unknown as PopulatedReport[]).map((report) => ({
      id: report._id.toString(),
      type: report.type,
      reason: report.reason,
      description: report.description,
      status: report.status,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      reportedBy: report.reportedBy ? {
        id: report.reportedBy._id.toString(),
        name: report.reportedBy.name,
        email: report.reportedBy.email,
        profilePicture: report.reportedBy.profilePicture
      } : null,
      reportedUser: report.reportedUser ? {
        id: report.reportedUser._id.toString(),
        name: report.reportedUser.name,
        email: report.reportedUser.email,
        profilePicture: report.reportedUser.profilePicture,
        isActive: report.reportedUser.isActive
      } : null
    }));

    const totalPages = Math.ceil(totalReports / limit);

    // Get statistics
    const stats = await Report.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ]);

    const statusStats = {
      pending: 0,
      reviewed: 0,
      resolved: 0,
      dismissed: 0
    };

    stats.forEach((stat: AggregationStat) => {
      if (stat._id in statusStats) {
        statusStats[stat._id as keyof typeof statusStats] = stat.count;
      }
    });

    return NextResponse.json({
      reports: formattedReports,
      pagination: {
        page,
        limit,
        totalReports,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      },
      stats: statusStats
    });

  } catch (error) {
    console.error("Admin reports fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDB();
    
    // Verify admin authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      );
    }

    // Check if user is admin
    const adminUser = await User.findById(decoded.userId);
    if (!adminUser || !adminUser.isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const { reportId, status, adminNotes } = await request.json();

    if (!reportId || !status) {
      return NextResponse.json(
        { error: "Report ID and status are required" },
        { status: 400 }
      );
    }

    const validStatuses = ["pending", "reviewed", "resolved", "dismissed"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Update report
    const updatedReport = await Report.findByIdAndUpdate(
      reportId,
      {
        status,
        adminNotes: adminNotes || "",
        reviewedBy: decoded.userId,
        reviewedAt: new Date()
      },
      { new: true }
    ).populate('reportedBy', 'name email profilePicture')
     .populate('reportedUser', 'name email profilePicture isActive');

    if (!updatedReport) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Report updated successfully",
      report: {
        id: updatedReport._id.toString(),
        type: updatedReport.type,
        reason: updatedReport.reason,
        description: updatedReport.description,
        status: updatedReport.status,
        adminNotes: updatedReport.adminNotes,
        createdAt: updatedReport.createdAt,
        updatedAt: updatedReport.updatedAt,
        reviewedAt: updatedReport.reviewedAt,
        reportedBy: updatedReport.reportedBy ? {
          id: updatedReport.reportedBy._id.toString(),
          name: updatedReport.reportedBy.name,
          email: updatedReport.reportedBy.email,
          profilePicture: updatedReport.reportedBy.profilePicture
        } : null,
        reportedUser: updatedReport.reportedUser ? {
          id: updatedReport.reportedUser._id.toString(),
          name: updatedReport.reportedUser.name,
          email: updatedReport.reportedUser.email,
          profilePicture: updatedReport.reportedUser.profilePicture,
          isActive: updatedReport.reportedUser.isActive
        } : null
      }
    });

  } catch (error) {
    console.error("Report update error:", error);
    return NextResponse.json(
      { error: "Failed to update report" },
      { status: 500 }
    );
  }
}