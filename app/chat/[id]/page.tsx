"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Image, Send, MoreVertical } from "lucide-react";
import { apiRequest } from "@/lib/api";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface Message {
  _id: string;
  sender: string | { _id: string; [key: string]: any };
  recipient: string;
  match: string;
  content: string;
  type: "text" | "image" | "video" | "audio" | "location";
  media?: {
    url: string;
    key: string;
    mimeType: string;
    size: number;
  };
  createdAt: string;
  readStatus: {
    isRead: boolean;
    readAt?: string;
  };
  isDeleted: boolean;
  // Optimistic / client-only state extensions
  uploading?: boolean;
  progress?: number; // future use if we implement xhr progress
  error?: string;
}

interface MatchData {
  _id: string;
  user1: {
    _id: string;
    firstName: string;
    photos: Array<{ url: string }>;
    lastSeen?: Date;
  };
  user2: {
    _id: string;
    firstName: string;
    photos: Array<{ url: string }>;
    lastSeen?: Date;
  };
  status: string;
  matchedAt: string;
  lastMessageAt?: string;
}

const formatMessageTime = (timestamp: string) => {
  if (!timestamp) return "Just now";
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "Just now";
    return `${formatDistanceToNow(date)} ago`;
  } catch {
    return "Just now";
  }
};

const useClickOutside = (handler: () => void) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handler]);

  return ref;
};

export default function ChatPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [match, setMatch] = useState<MatchData | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  // Function to retry loading messages
  const retryLoadMessages = () => {
    setError(null);
    setRetryCount((prev) => prev + 1);
  };

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load initial messages and setup real-time updates
  useEffect(() => {
    let retryTimeout: NodeJS.Timeout;

    const loadMessages = async () => {
      try {
        setLoading(true);
        const data = await apiRequest(`/messages?matchId=${id}`);
        setMessages(data.messages);
        setMatch(data.match);

        // Mark messages as read
        if (data.messages.length > 0) {
          await apiRequest("/messages/read", {
            method: "POST",
            body: JSON.stringify({ matchId: id }),
          });
        }
      } catch (error: any) {
        const errorMessage =
          error.message || "Failed to load messages. Please try again.";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadMessages();

      // Set up EventSource for real-time updates with auth token
      const token = localStorage.getItem("fiorell_auth_token");
      const eventSource = new EventSource(
        `/api/messages/subscribe?matchId=${id}&token=${token}`
      );

      eventSource.onmessage = (event) => {
        const message = JSON.parse(event.data);
        setMessages((prev) => [...prev, message]);
      };

      return () => {
        eventSource.close();
      };
    }
  }, [id, retryCount]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send text message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const data = await apiRequest("/messages", {
        method: "POST",
        body: JSON.stringify({
          matchId: id,
          content: newMessage.trim(),
          type: "text",
        }),
      });

      let newMsg = data.message;
      // Fallback: reconstruct message if missing required fields
      if (!newMsg || !newMsg.content) {
        newMsg = {
          _id: Math.random().toString(36).slice(2),
          sender: {
            id: user?.id,
            firstName: user?.firstName || "",
            isCurrentUser: true,
          },
          recipient:
            match?.user1._id === user?.id ? match?.user2._id : match?.user1._id,
          match: id,
          content: newMessage.trim(),
          type: "text",
          createdAt: new Date().toISOString(),
          readStatus: { isRead: false },
          isDeleted: false,
        };
      } else {
        newMsg = {
          ...newMsg,
          sender: {
            id: user?.id,
            firstName: user?.firstName || "",
            isCurrentUser: true,
          },
          content: newMessage.trim(),
        };
      }
      setMessages((prev) => [...prev, newMsg]);
      setNewMessage("");
      scrollToBottom();
      // Add small delay to ensure scroll happens after render
      setTimeout(scrollToBottom, 100);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSending(false);
    }
  };

  // Handle media upload
  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingMedia(true);

      // Derive message type from MIME
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const msgType: Message["type"] = isImage
        ? "image"
        : isVideo
        ? "video"
        : "image"; // default fallback

      // Create a local object URL for instant preview
      const objectUrl = URL.createObjectURL(file);
      const tempId = `temp-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

      // Build optimistic placeholder message
      const optimistic: Message = {
        _id: tempId,
        sender: {
          _id: user?.id || "",
          id: user?.id,
          firstName: user?.firstName,
          isCurrentUser: true,
        },
        recipient:
          (match?.user1._id === user?.id
            ? match?.user2._id
            : match?.user1._id) || "",
        match: String(id),
        content: "", // not used for media
        type: msgType,
        media: {
          url: objectUrl,
          key: "",
          mimeType: file.type,
          size: file.size,
        },
        createdAt: new Date().toISOString(),
        readStatus: { isRead: false },
        isDeleted: false,
        uploading: true,
        progress: undefined,
      };

      setMessages((prev) => [...prev, optimistic]);
      scrollToBottom();
      setTimeout(scrollToBottom, 50);

      // Create form data
      const formData = new FormData();
      formData.append("file", file);
      formData.append("matchId", id as string);

      // Upload to AWS via API route
      let data;
      try {
        data = await apiRequest("/messages/media", {
          method: "POST",
          body: formData,
          headers: {}, // Allow browser to set multipart boundary
        });
      } catch (err: any) {
        // Mark placeholder as failed
        setMessages((prev) =>
          prev.map((m) =>
            m._id === tempId
              ? {
                  ...m,
                  uploading: false,
                  error: err.message || "Upload failed",
                }
              : m
          )
        );
        throw err; // rethrow to surface error UI
      }

      // Replace optimistic message with server message
      setMessages((prev) =>
        prev.map((m) => {
          if (m._id !== tempId) return m;
          const serverMsg = data.message || {};
          return {
            ...m,
            _id: serverMsg._id || m._id,
            media: serverMsg.media ? { ...serverMsg.media } : m.media,
            uploading: false,
            error: undefined,
            createdAt: serverMsg.createdAt || m.createdAt,
          } as Message;
        })
      );

      // Release object URL now that we have server URL (if different)
      if (
        data?.message?.media?.url &&
        data.message.media.url !== optimistic.media?.url
      ) {
        URL.revokeObjectURL(objectUrl);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading chat messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <p className="text-red-500">{error}</p>
          <button
            onClick={retryLoadMessages}
            className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!match?.user1 || !match?.user2) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">Match data is not available</p>
        </div>
      </div>
    );
  }

  const otherUser = match.user1._id === user?.id ? match.user2 : match.user1;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Chat Header */}
      <header className="bg-white shadow-sm px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center space-x-3">
            <Link
              href="/matches"
              className="p-2 -ml-2 rounded-full text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <Link
              href={`/profile/${otherUser?._id}`}
              className="flex items-center space-x-3"
            >
              <img
                src={otherUser?.photos?.[0]?.url || "/api/placeholder/profile"}
                alt={otherUser?.firstName}
                className="h-10 w-10 rounded-full object-cover"
              />
              <div>
                <h2 className="font-medium text-gray-900">
                  {otherUser?.firstName}
                </h2>
                <p className="text-sm text-gray-500">
                  {otherUser?.lastSeen
                    ? `Last seen ${formatDistanceToNow(
                        new Date(otherUser.lastSeen)
                      )} ago`
                    : "Offline"}
                </p>
              </div>
            </Link>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <MoreVertical className="h-6 w-6 text-gray-600" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50">
                <button
                  onClick={() => {
                    router.push(`/profile/${otherUser._id}`);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 text-gray-700 text-sm"
                >
                  View Profile
                </button>
                <button
                  onClick={() => {
                    // TODO: Implement block user
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 text-red-600 text-sm"
                >
                  Block User
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 scroll-smooth">
        <div className="max-w-2xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No messages yet.</p>
              <p className="text-gray-400 text-sm mt-2">
                Send a message to start the conversation!
              </p>
            </div>
          ) : (
            messages.map((message, index) => {
              const senderId =
                typeof message.sender === "object" && message.sender !== null
                  ? String(message.sender.id)
                  : String(message.sender);
              const userId = String(user?.id);
              const isSender = senderId === userId;
              return (
                <div key={message._id || index} className="w-full mb-2">
                  <div
                    className={`flex ${
                      isSender ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] px-4 py-2 shadow-sm rounded-2xl ${
                        isSender
                          ? "bg-pink-500 text-white"
                          : "bg-white text-gray-900"
                      }`}
                    >
                      {message.type === "text" ? (
                        <p
                          key={message._id + "-text"}
                          className="whitespace-pre-line break-words"
                        >
                          {message.content}
                        </p>
                      ) : message.type === "image" ? (
                        <div className="relative">
                          <img
                            key={message._id + "-img"}
                            src={message.media?.url}
                            alt={
                              message.uploading
                                ? "Uploading image"
                                : "Shared image"
                            }
                            className={`rounded-lg max-w-full ${
                              message.uploading ? "opacity-70" : ""
                            }`}
                          />
                          {message.uploading && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="h-10 w-10 border-4 border-white/40 border-t-white rounded-full animate-spin" />
                            </div>
                          )}
                          {message.error && !message.uploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs text-white font-medium rounded-lg">
                              Upload failed
                            </div>
                          )}
                        </div>
                      ) : null}
                      <div
                        key={message._id + "-meta"}
                        className={`text-xs mt-1 ${
                          isSender ? "text-pink-200" : "text-gray-500"
                        }`}
                      >
                        {message.uploading
                          ? message.error
                            ? "Failed"
                            : "Uploading..."
                          : formatMessageTime(message.createdAt)}
                        {isSender && (
                          <span className="ml-1">
                            {message.readStatus &&
                            typeof message.readStatus.isRead === "boolean"
                              ? message.readStatus.isRead
                                ? "• Read"
                                : "• Sent"
                              : "• Sent"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-3 shadow-sm">
        <form
          onSubmit={handleSendMessage}
          className="max-w-2xl mx-auto flex items-center space-x-4"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (newMessage.trim()) {
                handleSendMessage(e);
              }
            }
          }}
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingMedia}
            className="p-2 rounded-full text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <Image className="h-6 w-6" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleMediaUpload}
            accept="image/*,video/*"
            className="hidden"
          />
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-100 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className={`p-2 rounded-full transition-all transform ${
              sending ? "bg-pink-100" : "hover:bg-pink-50"
            } ${
              !newMessage.trim() || sending
                ? "opacity-50 cursor-not-allowed"
                : "hover:scale-105"
            }`}
          >
            <Send
              className={`h-6 w-6 ${
                sending ? "text-pink-300" : "text-pink-500"
              }`}
            />
          </button>
        </form>
      </div>
    </div>
  );
}
