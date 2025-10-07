"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MessageCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useNotification } from "@/contexts/NotificationContext";
import { withAuth } from "@/contexts/AuthContext";

interface SupportTicket {
  id: string;
  subject: string;
  status: "open" | "closed" | "pending" | "in-progress";
  priority: "low" | "medium" | "high";
  type: "chat" | "email";
  createdAt: string;
  updatedAt: string;
}

function SupportPage() {
  const { showNotification } = useNotification();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const loadTickets = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/support", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(
              "fiorell_auth_token"
            )}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load support tickets");
        }

        const data = await response.json();
        setTickets(data.tickets || []);
      } catch (error) {
        console.error("Error loading tickets:", error);
        showNotification("Failed to load support tickets", "error");
      } finally {
        setLoading(false);
      }
    };

    loadTickets();
  }, [showNotification]);

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = ticket.subject
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
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
          <p className="text-gray-600">Loading support tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Link
            href="/help"
            className="flex items-center space-x-2 text-gray-600 hover:text-pink-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Help</span>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">
            My Support Tickets
          </h1>
          <Link
            href="/help"
            className="flex items-center space-x-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Ticket</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Search and Filters */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tickets..."
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
            </div>
          </div>

          {/* Tickets List */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {filteredTickets.length === 0 ? (
              <div className="p-12 text-center">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No support tickets
                </h3>
                <p className="text-gray-600 mb-6">
                  {searchQuery || statusFilter !== "all"
                    ? "No tickets match your search criteria."
                    : "You haven't created any support tickets yet."}
                </p>
                <Link
                  href="/help"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Support Ticket</span>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredTickets.map((ticket) => (
                  <Link
                    key={ticket.id}
                    href={`/support/chat/${ticket.id}`}
                    className="block p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          {getStatusIcon(ticket.status)}
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {ticket.subject}
                          </h3>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>
                            Created{" "}
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </span>
                          <span>
                            Updated{" "}
                            {new Date(ticket.updatedAt).toLocaleDateString()}
                          </span>
                          <span className="capitalize">{ticket.type}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            ticket.status
                          )}`}
                        >
                          {ticket.status.charAt(0).toUpperCase() +
                            ticket.status.slice(1)}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                            ticket.priority
                          )}`}
                        >
                          {ticket.priority.charAt(0).toUpperCase() +
                            ticket.priority.slice(1)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export default withAuth(SupportPage);
