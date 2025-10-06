"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  User,
  Bot,
} from "lucide-react";
import Link from "next/link";
import { useNotification } from "@/contexts/NotificationContext";
import { withAuth } from "@/contexts/AuthContext";

interface SupportMessage {
  id: string;
  content: string;
  isFromSupport: boolean;
  createdAt: string;
  readByUser: boolean;
  readBySupport: boolean;
}

interface SupportTicket {
  id: string;
  subject: string;
  status: "open" | "closed" | "pending" | "in-progress";
  priority: "low" | "medium" | "high";
  type: "chat" | "email";
  createdAt: string;
  updatedAt: string;
}

interface SupportConversation {
  ticket: SupportTicket;
  messages: SupportMessage[];
}

function SupportChatPage() {
  const { ticketId } = useParams();
  const router = useRouter();
  const { showNotification } = useNotification();
  const [conversation, setConversation] = useState<SupportConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  // Load conversation
  useEffect(() => {
    const loadConversation = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/support/${ticketId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("fiorell_auth_token")}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load conversation");
        }

        const data = await response.json();
        setConversation(data);
      } catch (error) {
        console.error("Error loading conversation:", error);
        showNotification("Failed to load conversation", "error");
        router.push("/support");
      } finally {
        setLoading(false);
      }
    };

    if (ticketId) {
      loadConversation();
    }
  }, [ticketId, router, showNotification]);

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const response = await fetch(`/api/support/${ticketId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("fiorell_auth_token")}`,
        },
        body: JSON.stringify({ content: newMessage.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();
      
      // Add new message to conversation
      if (conversation) {
        const newMessages = [...conversation.messages, data.message];
        
        // Add auto-response if present
        if (data.autoResponse) {
          // Ensure auto-response has proper structure for UI
          const autoResponseMessage = {
            id: data.autoResponse.id,
            content: data.autoResponse.content,
            isFromSupport: true,
            createdAt: data.autoResponse.timestamp || new Date().toISOString(),
            readByUser: false,
            readBySupport: true,
          };
          newMessages.push(autoResponseMessage);
        }
        
        setConversation({
          ...conversation,
          messages: newMessages,
        });
      }

      setNewMessage("");
      showNotification("Message sent successfully", "success");
    } catch (error) {
      console.error("Error sending message:", error);
      showNotification("Failed to send message", "error");
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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

  if (!conversation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Conversation not found</p>
          <Link
            href="/support"
            className="mt-4 inline-block px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
          >
            Back to Support
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4 border-b">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Link
            href="/support"
            className="flex items-center space-x-2 text-gray-600 hover:text-pink-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Support</span>
          </Link>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(conversation.ticket.status)}`}>
                {conversation.ticket.status.charAt(0).toUpperCase() + conversation.ticket.status.slice(1)}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(conversation.ticket.priority)}`}>
                {conversation.ticket.priority.charAt(0).toUpperCase() + conversation.ticket.priority.slice(1)} Priority
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Ticket Info */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {conversation.ticket.subject}
          </h1>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4" />
              <span>Created {new Date(conversation.ticket.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageCircle className="h-4 w-4" />
              <span>{conversation.ticket.type === "chat" ? "Live Chat" : "Email Support"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {conversation.messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.isFromSupport ? "justify-start" : "justify-end"}`}
            >
              <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                message.isFromSupport
                  ? "bg-white border border-gray-200 text-gray-900 shadow-sm"
                  : "bg-pink-500 text-white"
              }`}>
                <div className="flex items-center space-x-2 mb-1">
                  {message.isFromSupport ? (
                    <Bot className="h-4 w-4 text-gray-500" />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                  <span className="text-xs font-medium">
                    {message.isFromSupport ? "Support Team" : "You"}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs ${
                    message.isFromSupport ? "text-gray-500" : "text-pink-200"
                  }`}>
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                  {!message.isFromSupport && (
                    <div className="flex items-center space-x-1">
                      {message.readBySupport ? (
                        <CheckCircle className="h-3 w-3 text-pink-200" />
                      ) : (
                        <Clock className="h-3 w-3 text-pink-200" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      {conversation.ticket.status !== "closed" && (
        <div className="bg-white border-t px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end space-x-4">
              <div className="flex-1">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                  disabled={sending}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                className="px-6 py-3 bg-pink-500 text-white rounded-xl hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {sending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>{sending ? "Sending..." : "Send"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {conversation.ticket.status === "closed" && (
        <div className="bg-gray-100 border-t px-6 py-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center space-x-2 text-gray-600">
              <AlertCircle className="h-5 w-5" />
              <span>This support ticket has been closed. No new messages can be sent.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuth(SupportChatPage);