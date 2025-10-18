"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  User,
  Flag,
  MessageCircle,
  ArrowLeft,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useAuth, withAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/contexts/NotificationContext";
import Button from "@/components/ui/Button";

interface Report {
  _id: string;
  category: string;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed' | 'escalated';
  createdAt: string;
  reviewedAt?: string;
  adminNotes?: string;
  reporterId: {
    _id: string;
    name: string;
    email: string;
  };
  reportedUserId: {
    _id: string;
    name: string;
    email: string;
  };
  reviewedBy?: {
    _id: string;
    name: string;
    email: string;
  };
}

interface ReportStats {
  pending: number;
  reviewed: number;
  resolved: number;
  dismissed: number;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

function Moderation() {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<ReportStats>({ pending: 0, reviewed: 0, resolved: 0, dismissed: 0 });
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const loadReports = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("fiorell_auth_token");
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(statusFilter && { status: statusFilter }),
        ...(categoryFilter && { category: categoryFilter }),
      });

      const response = await fetch(`/api/admin/reports?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch reports");
      }

      const data = await response.json();
      setReports(data.reports);
      setStats(data.stats);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error loading reports:", error);
      showNotification("Failed to load reports", "error");
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, categoryFilter, showNotification]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleReportAction = async (reportId: string, action: string, notes: string) => {
    try {
      const token = localStorage.getItem("fiorell_auth_token");
      
      const response = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reportId,
          action,
          notes,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} report`);
      }

      const data = await response.json();
      showNotification(data.message, "success");
      loadReports(); // Reload reports list
      setShowReportModal(false);
      setReviewNotes("");
    } catch (error) {
      console.error(`Error ${action} report:`, error);
      showNotification(`Failed to ${action} report`, "error");
    }
  };

  const viewReportDetails = (report: Report) => {
    setSelectedReport(report);
    setShowReportModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'resolved': return 'text-green-600 bg-green-100';
      case 'dismissed': return 'text-gray-600 bg-gray-100';
      case 'escalated': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'harassment': return 'text-red-600 bg-red-100';
      case 'inappropriate_content': return 'text-orange-600 bg-orange-100';
      case 'spam': return 'text-yellow-600 bg-yellow-100';
      case 'fake_profile': return 'text-purple-600 bg-purple-100';
      case 'other': return 'text-gray-600 bg-gray-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const getPriorityIcon = (category: string) => {
    switch (category) {
      case 'harassment': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'inappropriate_content': return <Flag className="h-4 w-4 text-orange-500" />;
      case 'spam': return <MessageCircle className="h-4 w-4 text-yellow-500" />;
      case 'fake_profile': return <User className="h-4 w-4 text-purple-500" />;
      default: return <Flag className="h-4 w-4 text-blue-500" />;
    }
  };

  // Calculate stats summary
  const totalPending = stats?.pending || 0;
  const totalResolved = stats?.resolved || 0;
  const totalDismissed = stats?.dismissed || 0;

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <UserCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/admin" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <UserCheck className="h-8 w-8 text-emerald-500" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Content Moderation</h1>
                <p className="text-sm text-gray-600">{totalPending} pending reports</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center space-x-3">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalPending}</p>
                <p className="text-sm text-gray-600">Pending</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalResolved}</p>
                <p className="text-sm text-gray-600">Resolved</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center space-x-3">
              <XCircle className="h-8 w-8 text-gray-500" />
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalDismissed}</p>
                <p className="text-sm text-gray-600">Dismissed</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  0
                </p>
                <p className="text-sm text-gray-600">Escalated</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
              <option value="escalated">Escalated</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              <option value="harassment">Harassment</option>
              <option value="inappropriate_content">Inappropriate Content</option>
              <option value="spam">Spam</option>
              <option value="fake_profile">Fake Profile</option>
              <option value="other">Other</option>
            </select>

            <button
              onClick={loadReports}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Filter className="h-4 w-4 mr-2 inline" />
              Apply Filters
            </button>
          </div>
        </div>

        {/* Reports Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Report
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reporter
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reported User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reports.map((report) => (
                      <tr key={report._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getPriorityIcon(report.category)}
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(report.category)}`}>
                                  {report.category.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1 max-w-xs truncate">
                                {report.reason}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {report.reporterId.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {report.reporterId.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {report.reportedUserId.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {report.reportedUserId.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                            {report.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => viewReportDetails(report)}
                            className="text-emerald-600 hover:text-emerald-900 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={!pagination?.hasPrev}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={!pagination?.hasNext}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{((currentPage - 1) * 20) + 1}</span> to{' '}
                        <span className="font-medium">
                          {Math.min(currentPage * 20, pagination?.total || 0)}
                        </span>{' '}
                        of <span className="font-medium">{pagination?.total || 0}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={!pagination?.hasPrev}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={!pagination?.hasNext}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Report Details Modal */}
      <AnimatePresence>
        {showReportModal && selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowReportModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Report Details</h2>
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Report Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      {getPriorityIcon(selectedReport.category)}
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(selectedReport.category)}`}>
                        {selectedReport.category.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedReport.status)}`}>
                        {selectedReport.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(selectedReport.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-gray-900 font-medium">Reason:</p>
                  <p className="text-gray-700 mt-1">{selectedReport.reason}</p>
                </div>

                {/* Users Involved */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Reporter</h4>
                    <p className="text-gray-900">{selectedReport.reporterId.name}</p>
                    <p className="text-gray-600 text-sm">{selectedReport.reporterId.email}</p>
                  </div>
                  
                  <div className="bg-red-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Reported User</h4>
                    <p className="text-gray-900">{selectedReport.reportedUserId.name}</p>
                    <p className="text-gray-600 text-sm">{selectedReport.reportedUserId.email}</p>
                  </div>
                </div>

                {/* Review Section */}
                {selectedReport.status === 'pending' && (
                  <div className="border-t pt-6">
                    <h4 className="font-semibold text-gray-900 mb-3">Review Report</h4>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Add review notes..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      rows={3}
                    />
                    
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Button
                        onClick={() => handleReportAction(selectedReport._id, 'approve', reviewNotes)}
                        variant="primary"
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve & Resolve
                      </Button>
                      
                      <Button
                        onClick={() => handleReportAction(selectedReport._id, 'reject', reviewNotes)}
                        variant="secondary"
                        size="sm"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Dismiss
                      </Button>
                      
                      <Button
                        onClick={() => handleReportAction(selectedReport._id, 'escalate', reviewNotes)}
                        variant="secondary"
                        size="sm"
                        className="bg-red-600 text-white hover:bg-red-700"
                      >
                        <AlertTriangle className="h-4 w-4 mr-2" />
                        Escalate
                      </Button>
                    </div>
                  </div>
                )}

                {/* Review History */}
                {selectedReport.reviewedBy && (
                  <div className="border-t pt-6">
                    <h4 className="font-semibold text-gray-900 mb-3">Review History</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">
                        Reviewed by {selectedReport.reviewedBy.name} on{' '}
                        {selectedReport.reviewedAt && new Date(selectedReport.reviewedAt).toLocaleString()}
                      </p>
                      {selectedReport.adminNotes && (
                        <p className="text-gray-900 mt-2">{selectedReport.adminNotes}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default withAuth(Moderation);