"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  MessageCircle,
  AlertCircle,
  User,
  Send,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useNotification } from "@/contexts/NotificationContext";
import { withAuth } from "@/contexts/AuthContext";

interface Message {
  id: string;
  content: string;
  sender: "user" | "support";
  senderName?: string;
  agentName?: string;
  timestamp: string;
}

interface TicketDetails {
  id: string;
  userId: string;
  subject: string;
  status: "open" | "closed" | "pending" | "in-progress";
  priority: "low" | "medium" | "high";
  type: "chat" | "email";
  createdAt: string;
  userName?: string;
}

function AdminSupportChat() {
  const params = useParams();
  const { showNotification } = useNotification();
  const [ticket, setTicket] = useState<TicketDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  const ticketId = params?.ticketId as string;

  const loadTicketAndMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/support/${ticketId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("fiorell_auth_token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTicket(data.ticket);
        setMessages(data.messages || []);
        setNewStatus(data.ticket?.status || "");
      } else {
        showNotification("Failed to load ticket", "error");
      }
    } catch (error) {
      console.error("Error loading ticket:", error);
      showNotification("Error loading ticket", "error");
    } finally {
      setLoading(false);
    }
  }, [ticketId, showNotification]);

  useEffect(() => {
    if (ticketId) {
      loadTicketAndMessages();
    }
  }, [ticketId, loadTicketAndMessages]);

  const sendMessage = async () => {
    if (!message.trim() || sending) return;

    try {
      setSending(true);
      const response = await fetch(`/api/admin/support/${ticketId}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("fiorell_auth_token")}`,
        },
        body: JSON.stringify({
          content: message.trim(),
          agentName: "Support Team",
          updateStatus: newStatus !== ticket?.status ? newStatus : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      setMessage("");
      loadTicketAndMessages(); // Refresh
      showNotification("Message sent successfully", "success");
    } catch (error) {
      console.error("Error sending message:", error);
      showNotification("Failed to send message", "error");
    } finally {
      setSending(false);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Ticket not found</p>
          <Link
            href="/admin/support"
            className="mt-4 inline-flex items-center space-x-2 text-pink-600 hover:text-pink-700"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Link
            href="/admin/support"
            className="flex items-center space-x-2 text-gray-600 hover:text-pink-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-gray-900">{ticket.subject}</h1>
            <p className="text-sm text-gray-600">
              {ticket.userName || ticket.userId} • Created {new Date(ticket.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
              {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
              {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
            </span>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No messages yet</p>
            </div>
          ) : (
            messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.sender === "support" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                    msg.sender === "support"
                      ? "bg-pink-500 text-white"
                      : "bg-white text-gray-900 shadow-sm"
                  }`}
                >
                  {msg.sender === "support" && msg.agentName && (
                    <div className="flex items-center space-x-1 mb-1">
                      <Shield className="h-3 w-3" />
                      <span className="text-xs opacity-80">{msg.agentName}</span>
                    </div>
                  )}
                  {msg.sender === "user" && (
                    <div className="flex items-center space-x-1 mb-1">
                      <User className="h-3 w-3 text-gray-500" />
                      <span className="text-xs text-gray-500">
                        {msg.senderName || ticket.userName || "User"}
                      </span>
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={`text-xs mt-2 ${
                      msg.sender === "support" ? "text-pink-100" : "text-gray-500"
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Reply Section */}
      <div className="bg-white border-t border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          {/* Status Update */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Update Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="pending">Pending</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Message Input */}
          <div className="flex space-x-3">
            <div className="flex-1">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your reply..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!message.trim() || sending}
              className="flex items-center justify-center w-12 h-12 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50 transition-colors"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Cmd/Ctrl + Enter to send quickly
          </p>
        </div>
      </div>
    </div>
  );
}

export default withAuth(AdminSupportChat);