import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Report from "@/models/Report";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";

interface PopulatedUser {
  _id: string;
  name: string;
  email: string;
  profilePicture?: string;
  isActive?: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

interface PopulatedReport {
  _id: string;
  type: string;
  reason: string;
  description?: string;
  status: string;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt?: Date;
  reportedBy?: PopulatedUser;
  reportedUser?: PopulatedUser;
  reviewedBy?: PopulatedUser;
}

interface LeanReport {
  _id: unknown;
  type: string;
  reason: string;
  status: string;
  createdAt: Date;
  reportedBy?: {
    _id: unknown;
    name: string;
    email: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params;
    const { id } = resolvedParams;

    // Get report with populated user information
    const report = await Report.findById(id)
      .populate('reportedBy', 'name email profilePicture createdAt')
      .populate('reportedUser', 'name email profilePicture isActive createdAt lastLogin')
      .populate('reviewedBy', 'name email')
      .lean() as PopulatedReport | null;

    if (!report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    // Format report
    const formattedReport = {
      id: report._id.toString(),
      type: report.type,
      reason: report.reason,
      description: report.description,
      status: report.status,
      adminNotes: report.adminNotes,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      reviewedAt: report.reviewedAt,
      reportedBy: report.reportedBy ? {
        id: report.reportedBy._id.toString(),
        name: report.reportedBy.name,
        email: report.reportedBy.email,
        profilePicture: report.reportedBy.profilePicture,
        memberSince: report.reportedBy.createdAt
      } : null,
      reportedUser: report.reportedUser ? {
        id: report.reportedUser._id.toString(),
        name: report.reportedUser.name,
        email: report.reportedUser.email,
        profilePicture: report.reportedUser.profilePicture,
        isActive: report.reportedUser.isActive,
        memberSince: report.reportedUser.createdAt,
        lastLogin: report.reportedUser.lastLogin
      } : null,
      reviewedBy: report.reviewedBy ? {
        id: report.reviewedBy._id.toString(),
        name: report.reviewedBy.name,
        email: report.reviewedBy.email
      } : null
    };

    // Get related reports for this user
    const relatedReports = await Report.find({
      reportedUser: report.reportedUser?._id,
      _id: { $ne: report._id }
    })
    .populate('reportedBy', 'name email')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean() as unknown as LeanReport[];

    const formattedRelatedReports = relatedReports.map((r) => ({
      id: r._id?.toString() || '',
      type: r.type,
      reason: r.reason,
      status: r.status,
      createdAt: r.createdAt,
      reportedBy: r.reportedBy ? {
        id: r.reportedBy._id?.toString() || '',
        name: r.reportedBy.name,
        email: r.reportedBy.email
      } : null
    }));

    return NextResponse.json({
      report: formattedReport,
      relatedReports: formattedRelatedReports
    });

  } catch (error) {
    console.error("Report detail fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch report details" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const { status, adminNotes } = await request.json();

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
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
      id,
      {
        status,
        adminNotes: adminNotes || "",
        reviewedBy: decoded.userId,
        reviewedAt: new Date()
      },
      { new: true }
    ).populate('reportedBy', 'name email profilePicture')
     .populate('reportedUser', 'name email profilePicture isActive')
     .populate('reviewedBy', 'name email');

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
        } : null,
        reviewedBy: updatedReport.reviewedBy ? {
          id: updatedReport.reviewedBy._id.toString(),
          name: updatedReport.reviewedBy.name,
          email: updatedReport.reviewedBy.email
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