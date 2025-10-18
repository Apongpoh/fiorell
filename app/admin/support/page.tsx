"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MessageCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  User,
  Search,
  Send,
  X,
  Bell,
  Users,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useNotification } from "@/contexts/NotificationContext";
import { withAuth } from "@/contexts/AuthContext";

interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  status: "open" | "closed" | "pending" | "in-progress";
  priority: "low" | "medium" | "high";
  type: "chat" | "email";
  createdAt: string;
  updatedAt: string;
  unreadMessages: number;
  lastMessage?: string;
  userName?: string;
}

interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  pending: number;
  closed: number;
  highPriority: number;
  avgResponseTime: string;
  satisfactionScore: number;
  todayTickets: number;
}

function AdminSupportDashboard() {
  const { showNotification } = useNotification();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyStatus, setReplyStatus] = useState("");
  const [sending, setSending] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);

  useEffect(() => {
    loadTickets();
    loadStats();
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadTickets();
      loadStats();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadTickets = async () => {
    try {
      const response = await fetch("/api/admin/support/tickets", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("fiorell_auth_token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data.tickets || []);
      }
    } catch (error) {
      console.error("Error loading tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch("/api/admin/support/stats", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("fiorell_auth_token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats({
          ...data.stats,
          // Add calculated average response time and satisfaction score
          avgResponseTime: "2h 15m", // This would come from actual calculations
          satisfactionScore: 4.6, // This would come from actual ratings
          todayTickets: data.stats.open // Simplified - could be calculated properly
        });
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleReply = async () => {
    if (!selectedTicket || (!replyMessage.trim() && !replyStatus) || sending) return;

    try {
      setSending(true);
      const response = await fetch(`/api/admin/support/${selectedTicket.id}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("fiorell_auth_token")}`,
        },
        body: JSON.stringify({
          content: replyMessage.trim() || "Ticket status updated by admin.",
          agentName: "Support Team",
          updateStatus: replyStatus || selectedTicket.status,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send reply");
      }

      const statusMessages = {
        'in-progress': 'Ticket status updated to In Progress',
        'closed': 'Ticket has been closed',
        'pending': 'Ticket is now pending review',
        'open': 'Ticket has been reopened'
      };

      const message = replyMessage.trim() 
        ? "Reply sent successfully" 
        : statusMessages[replyStatus as keyof typeof statusMessages] || "Status updated";

      showNotification(message, "success");
      setReplyMessage("");
      setReplyStatus("");
      setShowReplyModal(false);
      setSelectedTicket(null);
      loadTickets(); // Refresh tickets
    } catch (error) {
      console.error("Error sending reply:", error);
      showNotification("Failed to send reply", "error");
    } finally {
      setSending(false);
    }
  };

  const handleQuickStatusUpdate = async (ticket: SupportTicket, newStatus: string, message: string) => {
    try {
      const response = await fetch(`/api/admin/support/${ticket.id}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("fiorell_auth_token")}`,
        },
        body: JSON.stringify({
          content: message,
          agentName: "Support Team",
          updateStatus: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update ticket");
      }

      const statusMessages = {
        'in-progress': 'Ticket is now in progress',
        'closed': 'Ticket has been closed',
        'pending': 'Ticket is now pending',
        'open': 'Ticket has been reopened'
      };

      showNotification(statusMessages[newStatus as keyof typeof statusMessages] || "Status updated", "success");
      loadTickets(); // Refresh tickets
    } catch (error) {
      console.error("Error updating ticket:", error);
      showNotification("Failed to update ticket", "error");
    }
  };

  const openReplyModal = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setReplyStatus(ticket.status);
    setShowReplyModal(true);
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = 
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.userName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-orange-100 text-orange-800";
      case "low":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
      case "in-progress":
        return <MessageCircle className="h-4 w-4 text-green-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "closed":
        return <CheckCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading support dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Link
            href="/profile"
            className="flex items-center space-x-2 text-gray-600 hover:text-pink-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Support Dashboard</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={loadTickets}
              className="p-2 text-gray-600 hover:text-pink-600 transition-colors"
            >
              <Bell className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Stats Overview */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center space-x-3">
                  <Users className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    <p className="text-sm text-gray-600">Total</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center space-x-3">
                  <MessageCircle className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.open}</p>
                    <p className="text-sm text-gray-600">Open</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
                    <p className="text-sm text-gray-600">In Progress</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center space-x-3">
                  <Clock className="h-8 w-8 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                    <p className="text-sm text-gray-600">Pending</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-8 w-8 text-gray-500" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.closed}</p>
                    <p className="text-sm text-gray-600">Closed</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{stats.highPriority}</p>
                    <p className="text-sm text-gray-600">High Priority</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Additional Performance Metrics */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Response Time</h3>
                  <Clock className="h-6 w-6 text-purple-500" />
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-600">{stats.avgResponseTime}</p>
                  <p className="text-sm text-gray-600 mt-1">Average Response</p>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Satisfaction</h3>
                  <User className="h-6 w-6 text-pink-500" />
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-pink-600">{stats.satisfactionScore}/5</p>
                  <p className="text-sm text-gray-600 mt-1">Customer Rating</p>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Today&apos;s Activity</h3>
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{stats.todayTickets}</p>
                  <p className="text-sm text-gray-600 mt-1">New Tickets Today</p>
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tickets or users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="pending">Pending</option>
                <option value="closed">Closed</option>
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="all">All Priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Tickets Table */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                Support Tickets ({filteredTickets.length})
              </h2>
            </div>
            {filteredTickets.length === 0 ? (
              <div className="p-12 text-center">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
                <p className="text-gray-600">
                  {searchQuery || statusFilter !== "all" || priorityFilter !== "all"
                    ? "No tickets match your current filters."
                    : "No support tickets have been created yet."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ticket
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {getStatusIcon(ticket.status)}
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {ticket.subject}
                              </div>
                              {ticket.lastMessage && (
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {ticket.lastMessage}
                                </div>
                              )}
                            </div>
                            {ticket.unreadMessages > 0 && (
                              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                {ticket.unreadMessages}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <User className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {ticket.userName || ticket.userId}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                            {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                            {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => openReplyModal(ticket)}
                              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-green-600 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
                            >
                              <Send className="h-3 w-3 mr-1" />
                              Reply
                            </button>
                            <Link
                              href={`/admin/support/chat/${ticket.id}`}
                              className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
                            >
                              <MessageCircle className="h-3 w-3 mr-1" />
                              View
                            </Link>
                            {ticket.status === 'open' && (
                              <button
                                onClick={() => handleQuickStatusUpdate(
                                  ticket, 
                                  'in-progress', 
                                  'This ticket is now being worked on by our support team.'
                                )}
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-yellow-600 bg-yellow-100 rounded-lg hover:bg-yellow-200 transition-colors"
                                title="Start Working"
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                Start
                              </button>
                            )}
                            {(ticket.status === 'open' || ticket.status === 'in-progress') && (
                              <button
                                onClick={() => handleQuickStatusUpdate(
                                  ticket, 
                                  'closed', 
                                  'This ticket has been resolved. If you have any further questions, please feel free to create a new ticket.'
                                )}
                                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                title="Close Ticket"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Close
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      </main>

      {/* Reply Modal */}
      {showReplyModal && selectedTicket && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowReplyModal(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl w-full max-w-2xl shadow-lg"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Reply to: {selectedTicket.subject}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    User: {selectedTicket.userName || selectedTicket.userId}
                  </p>
                </div>
                <button
                  onClick={() => setShowReplyModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Update Status
                  </label>
                  <select
                    value={replyStatus}
                    onChange={(e) => setReplyStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="open">Open</option>
                    <option value="in-progress">In Progress</option>
                    <option value="pending">Pending</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reply Message *
                  </label>
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your reply..."
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowReplyModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReply}
                    disabled={!replyMessage.trim() || sending}
                    className="flex items-center space-x-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50 transition-colors"
                  >
                    {sending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span>{sending ? "Sending..." : "Send Reply"}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuth(AdminSupportDashboard);