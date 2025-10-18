"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  RefreshCw,
  Send,
  User,
  Shield,
  MessageCircle,
  Clock,
  AlertCircle,
  CheckCircle,
  Tag,
  XCircle,
  Edit,
  Trash2,
  Star,
  Mail,
  Calendar,
  Eye,
  EyeOff
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useNotification } from "@/contexts/NotificationContext";
import { useAuth, withAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";

interface Message {
  id: string;
  content: string;
  sender: "user" | "support";
  senderName?: string;
  agentName?: string;
  timestamp: string;
  readByUser?: boolean;
  readBySupport?: boolean;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
}

interface TicketDetails {
  id: string;
  userId: string;
  subject: string;
  description: string;
  status: "open" | "closed" | "pending" | "in-progress";
  priority: "low" | "medium" | "high";
  category: string;
  type: "chat" | "email";
  createdAt: string;
  updatedAt: string;
  userName?: string;
  userEmail?: string;
  assignedTo?: {
    id: string;
    name: string;
  };
  tags?: string[];
  rating?: number;
  estimatedResolutionTime?: string;
}

function AdminSupportChat() {
  const { user } = useAuth();
  const params = useParams();
  const { showNotification } = useNotification();
  const [ticket, setTicket] = useState<TicketDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [isTyping,] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showTicketInfo, setShowTicketInfo] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [, setEditingMessage] = useState<string | null>(null);
  const [, setEditContent] = useState("");
  
  const ticketId = params?.ticketId as string;

  const loadTicketAndMessages = useCallback(async () => {
    if (!ticketId) {
      setError("No ticket ID provided");
      setLoading(false);
      return;
    }

    setLoading(true);
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
        const errorData = await response.json();
        setError(errorData.error || "Failed to load ticket");
      }
    } catch (error) {
      console.error("Error loading ticket:", error);
      setError("Error loading ticket");
    } finally {
      setLoading(false);
    }
  }, [ticketId]); // Simplified dependencies

  useEffect(() => {
    if (ticketId) {
      // Call loadTicketAndMessages directly on mount
      loadTicketAndMessages();
    }
  }, [ticketId, loadTicketAndMessages]); // Keep this one with the dependency for initial load

  useEffect(() => {
    // Handle auto-refresh
    if (autoRefresh) {
      const interval = setInterval(() => {
        if (ticketId) {
          // Call the API directly instead of using the callback
          const loadData = async () => {
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
              }
            } catch (error) {
              console.error("Auto-refresh error:", error);
            }
          };
          loadData();
        }
      }, 5000); // Refresh every 5 seconds
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, ticketId]); // Stable dependencies

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
          agentName: user?.firstName ? `${user.firstName} ${user.lastName}` : "Support Team",
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

  const addTag = async () => {
    if (!newTag.trim() || !ticket) return;

    try {
      const response = await fetch(`/api/admin/support/${ticketId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("fiorell_auth_token")}`,
        },
        body: JSON.stringify({
          tags: [...(ticket.tags || []), newTag.trim()],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add tag");
      }

      setNewTag("");
      loadTicketAndMessages();
      showNotification("Tag added successfully", "success");
    } catch (error) {
      console.error("Error adding tag:", error);
      showNotification("Failed to add tag", "error");
    }
  };

  const removeTag = async (tagToRemove: string) => {
    if (!ticket) return;

    try {
      const response = await fetch(`/api/admin/support/${ticketId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("fiorell_auth_token")}`,
        },
        body: JSON.stringify({
          tags: (ticket.tags || []).filter(tag => tag !== tagToRemove),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to remove tag");
      }

      loadTicketAndMessages();
      showNotification("Tag removed successfully", "success");
    } catch (error) {
      console.error("Error removing tag:", error);
      showNotification("Failed to remove tag", "error");
    }
  };

  const assignToSelf = async () => {
    if (!user || !ticket) return;

    try {
      const response = await fetch(`/api/admin/support/${ticketId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("fiorell_auth_token")}`,
        },
        body: JSON.stringify({
          assignedTo: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to assign ticket");
      }

      loadTicketAndMessages();
      showNotification("Ticket assigned to you", "success");
    } catch (error) {
      console.error("Error assigning ticket:", error);
      showNotification("Failed to assign ticket", "error");
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <Clock className="h-3 w-3" />;
      case "in-progress":
        return <RefreshCw className="h-3 w-3" />;
      case "pending":
        return <AlertCircle className="h-3 w-3" />;
      case "closed":
        return <CheckCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
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

  // Helper function for suggested responses
  const getSuggestedResponses = (category: string) => {
    const responses: Record<string, string[]> = {
      'general': [
        "Thank you for contacting us. I'll help you with this issue.",
        "Could you please provide more details?",
        "I understand your concern. Let me look into this."
      ],
      'technical': [
        "I'll investigate this technical issue for you.",
        "Can you try clearing your browser cache?",
        "Let me escalate this to our technical team."
      ],
      'billing': [
        "I'll review your billing information right away.",
        "Let me check your account details.",
        "I can help you with your billing inquiry."
      ],
      'account': [
        "I'll help you with your account settings.",
        "For security, I'll need to verify your identity first.",
        "I can assist you with updating your account."
      ],
      'report': [
        "Thank you for reporting this. We take all reports seriously.",
        "I'll investigate this report immediately.",
        "Your safety is our priority."
      ]
    };
    
    return responses[category] || responses.general;
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
      <header className="bg-white shadow-sm px-6 py-4 flex-shrink-0 border-b">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center space-x-4">
            <Link
              href="/admin/support"
              className="flex items-center space-x-2 text-gray-600 hover:text-pink-600 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </Link>
            <div className="h-6 w-px bg-gray-300" />
            <div>
              <h1 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <MessageCircle className="h-5 w-5 text-blue-500" />
                <span>{ticket.subject}</span>
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                <div className="flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>{ticket.userName || ticket.userId}</span>
                </div>
                {ticket.userEmail && (
                  <div className="flex items-center space-x-1">
                    <Mail className="h-4 w-4" />
                    <span>{ticket.userEmail}</span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Created {new Date(ticket.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                {getStatusIcon(ticket.status)}
                <span className="ml-1">{ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1).replace('-', ' ')}</span>
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`p-2 rounded-lg transition-colors ${
                  autoRefresh 
                    ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={autoRefresh ? 'Auto-refresh enabled' : 'Auto-refresh disabled'}
              >
                <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              </button>
              
              <button
                onClick={() => setShowTicketInfo(!showTicketInfo)}
                className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                title="Ticket information"
              >
                {showTicketInfo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              
              <button
                onClick={loadTicketAndMessages}
                className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                title="Refresh now"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Ticket Info Sidebar */}
        <AnimatePresence>
          {showTicketInfo && (
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              className="w-80 bg-white border-r border-gray-200 p-6 overflow-y-auto"
            >
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Ticket Details</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Category</label>
                      <p className="text-sm text-gray-900 mt-1 capitalize">{ticket.category}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Type</label>
                      <p className="text-sm text-gray-900 mt-1 capitalize">{ticket.type}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {new Date(ticket.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {new Date(ticket.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    {ticket.estimatedResolutionTime && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Resolution</label>
                        <p className="text-sm text-gray-900 mt-1">{ticket.estimatedResolutionTime}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Assignment</h3>
                  <div className="space-y-3">
                    {ticket.assignedTo ? (
                      <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                          <Shield className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{ticket.assignedTo.name}</p>
                          <p className="text-xs text-gray-500">Assigned Agent</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500 mb-3">No agent assigned</p>
                        <Button onClick={assignToSelf} variant="secondary" size="sm">
                          <User className="h-4 w-4 mr-2" />
                          Assign to Me
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Tags</h3>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {ticket.tags?.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            <XCircle className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        placeholder="Add tag..."
                        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                      />
                      <button
                        onClick={addTag}
                        disabled={!newTag.trim()}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {ticket.description && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Original Description</h3>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
                    </div>
                  </div>
                )}

                {ticket.rating && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 mb-3">Customer Rating</h3>
                    <div className="flex items-center space-x-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= ticket.rating!
                                ? 'text-yellow-400 fill-current'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-600">{ticket.rating}/5</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-4 overflow-y-auto">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No messages yet</p>
                  <p className="text-sm text-gray-500 mt-2">Start the conversation by sending the first message.</p>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex ${msg.sender === "support" ? "justify-end" : "justify-start"}`}
                  >
                    <div className="group relative">
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                          msg.sender === "support"
                            ? "bg-pink-500 text-white"
                            : "bg-white text-gray-900 shadow-sm border"
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
                        <div className="flex items-center justify-between mt-2">
                          <p
                            className={`text-xs ${
                              msg.sender === "support" ? "text-pink-100" : "text-gray-500"
                            }`}
                          >
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </p>
                          {msg.sender === "support" && (
                            <div className="flex items-center space-x-1">
                              {msg.readByUser ? (
                                <CheckCircle className="h-3 w-3 text-pink-200" />
                              ) : (
                                <Clock className="h-3 w-3 text-pink-200" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Message Actions */}
                      <div className="absolute top-0 right-0 transform translate-x-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center space-x-1 ml-2">
                          {msg.sender === "support" && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingMessage(msg.id);
                                  setEditContent(msg.content);
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                title="Edit message"
                              >
                                <Edit className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => {
                                  // Handle delete message
                                }}
                                className="p-1 text-gray-400 hover:text-red-600 rounded"
                                title="Delete message"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-gray-200 px-4 py-3 rounded-2xl">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
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
          <div className="space-y-3">
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
            
            {/* Quick Responses */}
            {ticket.category && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-gray-500 mr-2">Quick replies:</span>
                {getSuggestedResponses(ticket.category).map((response, index) => (
                  <button
                    key={index}
                    onClick={() => setMessage(response)}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    {response}
                  </button>
                ))}
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Press Cmd/Ctrl + Enter to send quickly
              </p>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">
                  {message.length}/1000
                </span>
                {autoRefresh && (
                  <div className="flex items-center space-x-1 text-xs text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Live</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(AdminSupportChat);