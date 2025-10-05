"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useNotification } from "@/contexts/NotificationContext";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  Image as ImageIcon,
  Send,
  MoreVertical,
  Timer,
} from "lucide-react";
import NextImage from "next/image";
import { apiRequest } from "@/lib/api";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface Message {
  id: string;
  sender: string | { id: string; [key: string]: unknown };
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
  disappearsAt?: string;
  disappearingDuration?: number;
  // Encryption fields removed
  // Optimistic / client-only state extensions
  uploading?: boolean;
  progress?: number; // future use if we implement xhr progress
  error?: string;
  // internal flag to avoid multiple refresh attempts for a single media asset
  _refreshed?: boolean;
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
  disappearingMessageDuration?: number;
}

const formatMessageTime = (timestamp: string | null) => {
  if (!timestamp) return "Just now";
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "Just now";
    return `${formatDistanceToNow(date)} ago`;
  } catch {
    return "Just now";
  }
};

// Removed unused useClickOutside

export default function ChatPage() {
  const { showNotification } = useNotification();
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [blockSubmitting, setBlockSubmitting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [showClearChatModal, setShowClearChatModal] = useState(false);
  const [clearChatSubmitting, setClearChatSubmitting] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null
  );
  const [showDeleteMessageModal, setShowDeleteMessageModal] = useState(false);
  const [deleteMessageSubmitting, setDeleteMessageSubmitting] = useState(false);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(
    new Set()
  );
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteSubmitting, setBulkDeleteSubmitting] = useState(false);
  const [disappearingTime, setDisappearingTime] = useState<number | null>(null);
  // (already declared below)
  // ...existing code...
  const [match, setMatch] = useState<MatchData | null>(null);
  // Load persistent disappearing message duration from match data
  useEffect(() => {
    if (typeof match?.disappearingMessageDuration === "number") {
      setDisappearingTime(match.disappearingMessageDuration);
    }
  }, [match]);
  const [showDisappearingModal, setShowDisappearingModal] = useState(false);
  // Encryption state removed
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // (already declared above)
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

  // Initialize encryption for the user
  useEffect(() => {
    // Encryption initialization removed
  }, [user?.id, id, showNotification]);

  // Decrypt messages when they are loaded
  const decryptMessages = useCallback(
    async (messages: Message[]): Promise<Message[]> => {
      // Encryption removed, just return messages as-is
      return messages;
    },
    []
  );

  // Load initial messages and setup real-time updates
  useEffect(() => {
    // Removed unused retryTimeout

    const loadMessages = async (): Promise<void> => {
      try {
        setLoading(true);
        const data = await apiRequest(`/messages?matchId=${id}`);
        if (
          !data ||
          typeof data !== "object" ||
          !("messages" in data) ||
          !("match" in data)
        ) {
          throw new Error("Invalid messages response");
        }
        const messagesVal = (data as { messages?: unknown; match?: unknown })
          .messages;
        const matchVal = (data as { messages?: unknown; match?: unknown })
          .match;
        if (
          !Array.isArray(messagesVal) ||
          typeof matchVal !== "object" ||
          matchVal === null
        ) {
          throw new Error("Invalid messages data");
        }

        // Just set messages as-is
        setMessages(messagesVal as Message[]);
        setMatch(matchVal as MatchData);

        // Check if other user has encryption enabled
        // Encryption check removed

        // Mark messages as read
        const hasMessagesArray = Array.isArray(
          (data as { messages?: unknown[] }).messages
        );
        if (
          hasMessagesArray &&
          (data as { messages?: unknown[] }).messages!.length > 0
        ) {
          await apiRequest("/messages/read", {
            method: "POST",
            body: JSON.stringify({ matchId: id }),
          });
        }
      } catch (error: unknown) {
        let errorMessage = "Failed to load messages. Please try again.";
        if (
          typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof (error as { message: unknown }).message === "string"
        ) {
          errorMessage = (error as { message: string }).message;
        }
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

      eventSource.onmessage = async (event) => {
        const message = JSON.parse(event.data);

        // Just add message as-is
        setMessages((prev) => [...prev, message]);
      };

      return () => {
        eventSource.close();
      };
    }
  }, [id, retryCount, decryptMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check for expired disappearing messages
  useEffect(() => {
    const checkExpiredMessages = () => {
      setMessages((prev) => {
        const filtered = prev.filter((message) => {
          if (message.disappearsAt) {
            const isExpired =
              new Date(message.disappearsAt).getTime() <= Date.now();
            return !isExpired;
          }
          return true;
        });
        return filtered;
      });
    };

    // Check every 5 seconds for expired messages
    const interval = setInterval(checkExpiredMessages, 5000);

    // Also check immediately on mount
    checkExpiredMessages();

    return () => clearInterval(interval);
  }, []);

  // Immediately remove expired messages on render
  useEffect(() => {
    setMessages((prev) =>
      prev.filter((message) => {
        if (message.disappearsAt) {
          return new Date(message.disappearsAt).getTime() > Date.now();
        }
        return true;
      })
    );
  }, []);

  // Send text message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);

      interface MessagePayload {
        matchId: string;
        content: string;
        type: string;
        disappearingDuration?: number;
        disappearsAt?: string;
        isEncrypted?: boolean;
        encryptedContent?: string;
        iv?: string;
        keyId?: string;
      }

      const messagePayload: MessagePayload = {
        matchId: id as string,
        content: newMessage.trim(),
        type: "text",
        ...(disappearingTime && {
          disappearingDuration: disappearingTime,
          disappearsAt: new Date(
            Date.now() + disappearingTime * 1000
          ).toISOString(),
        }),
      };

      // Encryption logic removed; always send plaintext

      const data = await apiRequest("/messages", {
        method: "POST",
        body: JSON.stringify(messagePayload),
      });
      interface ServerMessageShape {
        _id?: string;
        content?: string;
        type?: Message["type"];
        media?: {
          url?: string;
          key?: string;
          mimeType?: string;
          size?: number;
        };
        createdAt?: string;
        readStatus?: { isRead?: boolean; readAt?: string };
      }
      const rawMsg: unknown =
        data && typeof data === "object" && "message" in data
          ? (data as { message?: unknown }).message
          : undefined;
      let newMsg:
        | Message
        | (ServerMessageShape & { sender?: unknown })
        | undefined =
        rawMsg && typeof rawMsg === "object"
          ? (rawMsg as ServerMessageShape & { sender?: unknown })
          : undefined;
      // Fallback: reconstruct message if missing required fields
      const hasContent = (obj: unknown): obj is { content: string } =>
        typeof obj === "object" &&
        obj !== null &&
        "content" in obj &&
        typeof (obj as { content: unknown }).content === "string";
      if (!newMsg || !hasContent(newMsg)) {
        const fallback: Message = {
          id: Math.random().toString(36).slice(2),
          sender: user?.id || "",
          recipient:
            (match?.user1._id === user?.id
              ? match?.user2._id
              : match?.user1._id) || "",
          match: String(id),
          content: newMessage.trim(),
          type: "text",
          createdAt: new Date().toISOString(),
          readStatus: { isRead: false },
          isDeleted: false,
          ...(disappearingTime && {
            disappearingDuration: disappearingTime,
            disappearsAt: new Date(
              Date.now() + disappearingTime * 1000
            ).toISOString(),
          }),
        };
        newMsg = fallback;
      } else {
        const enriched: Message = {
          id: ((): string => {
            const maybe = (newMsg as { _id?: unknown })?._id;
            return typeof maybe === "string" && maybe.trim()
              ? maybe
              : Math.random().toString(36).slice(2);
          })(),
          sender: user?.id || "",
          recipient:
            (match?.user1._id === user?.id
              ? match?.user2._id
              : match?.user1._id) || "",
          match: String(id),
          content: newMessage.trim(),
          type: ((): Message["type"] => {
            const t = (newMsg as { type?: unknown })?.type;
            return t === "image" ||
              t === "video" ||
              t === "audio" ||
              t === "location"
              ? t
              : "text";
          })(),
          media: ((): Message["media"] => {
            const media = (newMsg as { media?: unknown })?.media;
            if (media && typeof media === "object") {
              interface MediaShape {
                url?: string;
                key?: string;
                mimeType?: string;
                size?: number;
              }
              const raw = media as {
                url?: unknown;
                key?: unknown;
                mimeType?: unknown;
                size?: unknown;
              };
              const shaped: MediaShape = {
                url: typeof raw.url === "string" ? raw.url : undefined,
                key: typeof raw.key === "string" ? raw.key : undefined,
                mimeType:
                  typeof raw.mimeType === "string" ? raw.mimeType : undefined,
                size: typeof raw.size === "number" ? raw.size : undefined,
              };
              if (shaped.url || shaped.key || shaped.mimeType) {
                return {
                  url: shaped.url ?? "",
                  key: shaped.key ?? "",
                  mimeType: shaped.mimeType ?? "",
                  size: shaped.size ?? 0,
                };
              }
            }
            return undefined;
          })(),
          createdAt: ((): string => {
            const c = (newMsg as { createdAt?: unknown })?.createdAt;
            return typeof c === "string" && c ? c : new Date().toISOString();
          })(),
          readStatus: ((): Message["readStatus"] => {
            const rs = (newMsg as { readStatus?: unknown })?.readStatus;
            if (rs && typeof rs === "object" && "isRead" in rs) {
              const ir = (rs as { isRead?: unknown }).isRead;
              return { isRead: typeof ir === "boolean" ? ir : false };
            }
            return { isRead: false };
          })(),
          isDeleted: false,
        };
        newMsg = enriched;
      }
      setMessages((prev) => [...prev, newMsg as Message]);
      setNewMessage("");
      scrollToBottom();
      // Add small delay to ensure scroll happens after render
      setTimeout(scrollToBottom, 100);
    } catch (error: unknown) {
      let errorMessage = "Failed to send message.";
      if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message: unknown }).message === "string"
      ) {
        errorMessage = (error as { message: string }).message;
      }
      setError(errorMessage);
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
        id: tempId,
        sender: {
          _id: user?.id || "",
          id: user?.id || "",
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
      } catch (err: unknown) {
        // Mark placeholder as failed
        let errorMessage = "Upload failed";
        if (
          typeof err === "object" &&
          err !== null &&
          "message" in err &&
          typeof (err as { message: unknown }).message === "string"
        ) {
          errorMessage = (err as { message: string }).message;
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  uploading: false,
                  error: errorMessage,
                }
              : m
          )
        );
        throw err;
      }

      // Replace optimistic message with server message
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== tempId) return m;
          interface ServerMessageShape {
            _id?: string;
            media?: {
              url?: string;
              key?: string;
              mimeType?: string;
              size?: number;
            };
            createdAt?: string;
          }
          const serverRaw: unknown =
            data && typeof data === "object" && "message" in data
              ? (data as { message?: unknown }).message
              : undefined;
          const serverMsg: ServerMessageShape =
            serverRaw && typeof serverRaw === "object"
              ? (serverRaw as ServerMessageShape)
              : {};
          return {
            ...m,
            id: serverMsg._id || m.id,
            media: serverMsg.media ? { ...serverMsg.media } : m.media,
            uploading: false,
            error: undefined,
            createdAt: serverMsg.createdAt || m.createdAt,
          } as Message;
        })
      );

      // Release object URL now that we have server URL (if different)
      if (
        data &&
        typeof data === "object" &&
        "message" in data &&
        (data as { message?: { media?: { url?: string } } }).message?.media
          ?.url &&
        (data as { message?: { media?: { url?: string } } }).message?.media
          ?.url !== optimistic.media?.url
      ) {
        URL.revokeObjectURL(objectUrl);
      }
    } catch (error: unknown) {
      let errorMessage = "Failed to upload media.";
      if (
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as { message: unknown }).message === "string"
      ) {
        errorMessage = (error as { message: string }).message;
      }
      setError(errorMessage);
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
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push("/matches")}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={retryLoadMessages}
              className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
            >
              Try Again
            </button>
          </div>
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
              <NextImage
                src={otherUser?.photos?.[0]?.url || "/api/placeholder/profile"}
                alt={otherUser?.firstName || "Profile photo"}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover"
                priority
                unoptimized
                onError={(e) => {
                  // Fallback to tiny transparent PNG if SVG blocked
                  const target = e.target as HTMLImageElement;
                  if (target.src.includes("/api/placeholder/profile")) {
                    target.src =
                      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAYAAACM/rhtAAAAMElEQVR4nO3OsQkAIBDDwPT/p62hC0KCSDiZ3STb2WIAAAAAAAAAAAD4G8t2Ajy5Yjw7m0n2AQBRS9iQAAAAAElFTkSuQmCC";
                  }
                }}
              />
              <div>
                <h2 className="font-medium text-gray-900">
                  {otherUser?.firstName}
                </h2>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-gray-500">
                    {otherUser?.lastSeen
                      ? `Last seen ${formatDistanceToNow(
                          new Date(otherUser.lastSeen)
                        )} ago`
                      : "Offline"}
                  </p>
                  {/* Encryption UI removed */}
                </div>
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
                    setShowBlockModal(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 text-red-600 text-sm"
                >
                  Block User
                </button>
                <button
                  onClick={() => {
                    setShowReportModal(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 text-yellow-600 text-sm"
                >
                  Report User
                </button>
                <button
                  onClick={() => {
                    setShowClearChatModal(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 text-orange-600 text-sm"
                >
                  Clear Chat
                </button>
                <button
                  onClick={() => {
                    setBulkSelectMode(!bulkSelectMode);
                    setSelectedMessages(new Set());
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 text-purple-600 text-sm"
                >
                  {bulkSelectMode ? "Exit Select Mode" : "Select Messages"}
                </button>
                <button
                  onClick={() => {
                    setShowDisappearingModal(true);
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 text-green-600 text-sm"
                >
                  <div className="flex items-center gap-2">
                    Disappearing Messages
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white/95 rounded-2xl shadow-lg border border-gray-100 w-full max-w-md mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Block User</h3>
            <p className="text-base text-gray-600 mb-4">
              Optionally, let us know why you are blocking this user.
            </p>
            <textarea
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-gray-50 mb-4"
              placeholder="Reason (optional)"
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 px-6 py-3 text-base bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={blockSubmitting}
                onClick={async () => {
                  try {
                    setBlockSubmitting(true);
                    const resp = await fetch(`/api/user/block`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem(
                          "fiorell_auth_token"
                        )}`,
                      },
                      body: JSON.stringify({
                        targetUserId: otherUser._id,
                        reason: blockReason,
                      }),
                    });
                    const data = await resp.json();
                    if (!resp.ok)
                      throw new Error(data.error || "Failed to block user");
                    showNotification(
                      "User blocked. You won't see this user again.",
                      "success"
                    );
                    setShowBlockModal(false);
                  } catch (e) {
                    const msg =
                      typeof e === "object" && e && "message" in e
                        ? e.message
                        : "Failed to block user";
                    showNotification(String(msg), "error");
                  } finally {
                    setBlockSubmitting(false);
                  }
                }}
                className="inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 px-6 py-3 text-base bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:shadow-lg transform hover:scale-105 focus:ring-2 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {blockSubmitting ? "Blocking..." : "Block"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white/95 rounded-2xl shadow-lg border border-gray-100 w-full max-w-md mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Report User
            </h3>
            <p className="text-base text-gray-600 mb-4">
              Let us know why you are reporting this user.
            </p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              rows={4}
              className="w-full border border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-gray-50 mb-4"
              placeholder="Reason (optional)"
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 px-6 py-3 text-base bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reportSubmitting}
                onClick={async () => {
                  try {
                    setReportSubmitting(true);
                    const resp = await fetch(`/api/user/report`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem(
                          "fiorell_auth_token"
                        )}`,
                      },
                      body: JSON.stringify({
                        targetUserId: otherUser._id,
                        reason: reportReason,
                      }),
                    });
                    const data = await resp.json();
                    if (!resp.ok)
                      throw new Error(data.error || "Failed to submit report");
                    showNotification(
                      "Report submitted. Our team will review.",
                      "success"
                    );
                    setShowReportModal(false);
                  } catch (e) {
                    const msg =
                      typeof e === "object" && e && "message" in e
                        ? e.message
                        : "Failed to submit report";
                    showNotification(String(msg), "error");
                  } finally {
                    setReportSubmitting(false);
                  }
                }}
                className="inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 px-6 py-3 text-base bg-gradient-to-r from-yellow-500 to-pink-500 text-white hover:shadow-lg transform hover:scale-105 focus:ring-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {reportSubmitting ? "Submitting..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Chat Modal */}
      {showClearChatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white/95 rounded-2xl shadow-lg border border-gray-100 w-full max-w-md mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Clear Chat</h3>
            <p className="text-base text-gray-600 mb-4">
              Are you sure you want to clear this chat? This will remove all
              messages from your view only.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowClearChatModal(false)}
                className="inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 px-6 py-3 text-base bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={clearChatSubmitting}
                onClick={async () => {
                  try {
                    setClearChatSubmitting(true);
                    const resp = await fetch(`/api/messages/clear`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem(
                          "fiorell_auth_token"
                        )}`,
                      },
                      body: JSON.stringify({
                        matchId: id,
                      }),
                    });
                    const data = await resp.json();
                    if (!resp.ok)
                      throw new Error(data.error || "Failed to clear chat");
                    showNotification("Chat cleared successfully.", "success");
                    setMessages([]);
                    setShowClearChatModal(false);
                  } catch (e) {
                    const msg =
                      typeof e === "object" && e && "message" in e
                        ? e.message
                        : "Failed to clear chat";
                    showNotification(String(msg), "error");
                  } finally {
                    setClearChatSubmitting(false);
                  }
                }}
                className="inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 px-6 py-3 text-base bg-gradient-to-r from-orange-500 to-red-500 text-white hover:shadow-lg transform hover:scale-105 focus:ring-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {clearChatSubmitting ? "Clearing..." : "Clear Chat"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Message Modal */}
      {showDeleteMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white/95 rounded-2xl shadow-lg border border-gray-100 w-full max-w-md mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Delete Message
            </h3>
            <p className="text-base text-gray-600 mb-4">
              Are you sure you want to delete this message? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteMessageModal(false);
                  setSelectedMessageId(null);
                }}
                className="inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 px-6 py-3 text-base bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMessageSubmitting}
                onClick={async () => {
                  try {
                    setDeleteMessageSubmitting(true);
                    const resp = await fetch(`/api/messages/delete`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem(
                          "fiorell_auth_token"
                        )}`,
                      },
                      body: JSON.stringify({
                        messageId: selectedMessageId,
                      }),
                    });
                    const data = await resp.json();
                    if (!resp.ok)
                      throw new Error(data.error || "Failed to delete message");
                    showNotification(
                      "Message deleted successfully.",
                      "success"
                    );
                    setMessages((prev) =>
                      prev.filter((m) => m.id !== selectedMessageId)
                    );
                    setShowDeleteMessageModal(false);
                    setSelectedMessageId(null);
                  } catch (e) {
                    const msg =
                      typeof e === "object" && e && "message" in e
                        ? e.message
                        : "Failed to delete message";
                    showNotification(String(msg), "error");
                  } finally {
                    setDeleteMessageSubmitting(false);
                  }
                }}
                className="inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 px-6 py-3 text-base bg-gradient-to-r from-red-500 to-pink-500 text-white hover:shadow-lg transform hover:scale-105 focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteMessageSubmitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white/95 rounded-2xl shadow-lg border border-gray-100 w-full max-w-md mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Delete Messages
            </h3>
            <p className="text-base text-gray-600 mb-4">
              Are you sure you want to delete {selectedMessages.size} selected
              message{selectedMessages.size > 1 ? "s" : ""}? This action cannot
              be undone.
            </p>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowBulkDeleteModal(false);
                }}
                className="inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 px-6 py-3 text-base bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkDeleteSubmitting}
                onClick={async () => {
                  try {
                    setBulkDeleteSubmitting(true);

                    // Delete messages in batches
                    const messageIds = Array.from(selectedMessages);
                    const deletePromises = messageIds.map((messageId) =>
                      fetch(`/api/messages/delete`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${localStorage.getItem(
                            "fiorell_auth_token"
                          )}`,
                        },
                        body: JSON.stringify({ messageId }),
                      })
                    );

                    const responses = await Promise.all(deletePromises);
                    const failedDeletes = responses.filter((resp) => !resp.ok);

                    if (failedDeletes.length > 0) {
                      throw new Error(
                        `Failed to delete ${failedDeletes.length} message(s)`
                      );
                    }

                    showNotification(
                      `Successfully deleted ${messageIds.length} message(s).`,
                      "success"
                    );
                    setMessages((prev) =>
                      prev.filter((m) => !selectedMessages.has(m.id))
                    );
                    setSelectedMessages(new Set());
                    setBulkSelectMode(false);
                    setShowBulkDeleteModal(false);
                  } catch (e) {
                    const msg =
                      typeof e === "object" && e && "message" in e
                        ? e.message
                        : "Failed to delete messages";
                    showNotification(String(msg), "error");
                  } finally {
                    setBulkDeleteSubmitting(false);
                  }
                }}
                className="inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 px-6 py-3 text-base bg-gradient-to-r from-red-500 to-pink-500 text-white hover:shadow-lg transform hover:scale-105 focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkDeleteSubmitting
                  ? "Deleting..."
                  : `Delete ${selectedMessages.size}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disappearing Messages Modal */}
      {showDisappearingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white/95 rounded-2xl shadow-lg border border-gray-100 w-full max-w-md mx-4 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Disappearing Messages
            </h3>
            <p className="text-base text-gray-600 mb-4">
              Set how long messages should remain visible before automatically
              disappearing.
            </p>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => setDisappearingTime(null)}
                className={`w-full p-3 rounded-lg border text-left transition-colors ${
                  disappearingTime === null
                    ? "border-pink-500 bg-pink-50 text-pink-700"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="font-medium">Off</div>
                <div className="text-sm text-gray-500">
                  Messages don&apos;t disappear
                </div>
              </button>

              <button
                onClick={() => setDisappearingTime(300)}
                className={`w-full p-3 rounded-lg border text-left transition-colors ${
                  disappearingTime === 300
                    ? "border-pink-500 bg-pink-50 text-pink-700"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="font-medium">5 Minutes</div>
                <div className="text-sm text-gray-500">
                  Messages disappear after 5 minutes
                </div>
              </button>

              <button
                onClick={() => setDisappearingTime(1800)}
                className={`w-full p-3 rounded-lg border text-left transition-colors ${
                  disappearingTime === 1800
                    ? "border-pink-500 bg-pink-50 text-pink-700"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="font-medium">30 Minutes</div>
                <div className="text-sm text-gray-500">
                  Messages disappear after 30 minutes
                </div>
              </button>

              <button
                onClick={() => setDisappearingTime(3600)}
                className={`w-full p-3 rounded-lg border text-left transition-colors ${
                  disappearingTime === 3600
                    ? "border-pink-500 bg-pink-50 text-pink-700"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="font-medium">1 Hour</div>
                <div className="text-sm text-gray-500">
                  Messages disappear after 1 hour
                </div>
              </button>

              <button
                onClick={() => setDisappearingTime(86400)}
                className={`w-full p-3 rounded-lg border text-left transition-colors ${
                  disappearingTime === 86400
                    ? "border-pink-500 bg-pink-50 text-pink-700"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="font-medium">24 Hours</div>
                <div className="text-sm text-gray-500">
                  Messages disappear after 24 hours
                </div>
              </button>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowDisappearingModal(false)}
                className="inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 px-6 py-3 text-base bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowDisappearingModal(false);
                  // Persist setting to backend
                  try {
                    await apiRequest(`/matches/${id}/disappearing`, {
                      method: "PATCH",
                      body: JSON.stringify({
                        disappearingMessageDuration: disappearingTime ?? 0,
                      }),
                    });
                    if (disappearingTime) {
                      const timeText =
                        disappearingTime < 3600
                          ? `${disappearingTime / 60} minutes`
                          : disappearingTime < 86400
                          ? `${disappearingTime / 3600} hours`
                          : `${disappearingTime / 86400} days`;
                      showNotification(
                        `Disappearing messages enabled. Messages will delete after ${timeText}.`,
                        "success"
                      );
                    } else {
                      showNotification(
                        "Disappearing messages disabled.",
                        "success"
                      );
                    }
                  } catch {
                    showNotification(
                      "Failed to save disappearing message setting.",
                      "error"
                    );
                  }
                }}
                className="inline-flex items-center justify-center rounded-full font-semibold transition-all duration-200 px-6 py-3 text-base bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:shadow-lg transform hover:scale-105 focus:ring-2 focus:ring-indigo-500"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 pb-20 bg-gray-50 scroll-smooth">
        <div className="max-w-2xl mx-auto">
          {/* Bulk Select Toolbar */}
          {bulkSelectMode && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  {selectedMessages.size} selected
                </span>
                <button
                  onClick={() => {
                    const userMessages = messages.filter((m) => {
                      const senderId =
                        typeof m.sender === "object" && m.sender !== null
                          ? String(m.sender.id)
                          : String(m.sender);
                      return senderId === String(user?.id);
                    });
                    setSelectedMessages(new Set(userMessages.map((m) => m.id)));
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Select All Mine
                </button>
                <button
                  onClick={() => setSelectedMessages(new Set())}
                  className="text-sm text-gray-600 hover:text-gray-700"
                >
                  Clear Selection
                </button>
              </div>
              <div className="flex items-center gap-2">
                {selectedMessages.size > 0 && (
                  <button
                    onClick={() => setShowBulkDeleteModal(true)}
                    className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete ({selectedMessages.size})
                  </button>
                )}
                <button
                  onClick={() => {
                    setBulkSelectMode(false);
                    setSelectedMessages(new Set());
                  }}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
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
                <div key={message.id || index} className="w-full mb-2">
                  <div
                    className={`flex ${
                      isSender ? "justify-end" : "justify-start"
                    }`}
                  >
                    {/* Checkbox for bulk select mode */}
                    {bulkSelectMode && isSender && (
                      <div className="flex items-start pt-2 mr-2">
                        <input
                          type="checkbox"
                          checked={selectedMessages.has(message.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedMessages);
                            if (e.target.checked) {
                              newSelected.add(message.id);
                            } else {
                              newSelected.delete(message.id);
                            }
                            setSelectedMessages(newSelected);
                          }}
                          className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500"
                        />
                      </div>
                    )}
                    <div
                      className={`max-w-[70%] px-4 py-2 shadow-sm rounded-2xl relative group ${
                        isSender
                          ? "bg-pink-500 text-white"
                          : "bg-white text-gray-900"
                      } ${
                        bulkSelectMode && isSender
                          ? "cursor-default"
                          : isSender
                          ? "cursor-pointer"
                          : ""
                      }`}
                      onClick={() => {
                        if (!bulkSelectMode && isSender) {
                          setSelectedMessageId(message.id);
                          setShowDeleteMessageModal(true);
                        }
                      }}
                    >
                      {message.type === "text" ? (
                        <p
                          key={message.id + "-text"}
                          className="whitespace-pre-line break-words"
                        >
                          {message.content}
                        </p>
                      ) : message.type === "image" ? (
                        <div className="relative">
                          <NextImage
                            key={message.id + "-img"}
                            src={message.media?.url || ""}
                            alt={
                              message.uploading
                                ? "Uploading image"
                                : "Shared image"
                            }
                            width={400}
                            height={400}
                            className={`rounded-lg max-w-full ${
                              message.uploading ? "opacity-70" : ""
                            }`}
                            priority={!message.uploading}
                            unoptimized
                            onError={async () => {
                              // Attempt one refresh for expired/403 signed URLs
                              if (!message.media?.key || message._refreshed)
                                return;
                              try {
                                const token =
                                  typeof window !== "undefined"
                                    ? localStorage.getItem("fiorell_auth_token")
                                    : null;
                                const res = await fetch(
                                  `/api/messages/media/refresh?key=${encodeURIComponent(
                                    message.media.key
                                  )}${
                                    token
                                      ? `&token=${encodeURIComponent(token)}`
                                      : ""
                                  }`
                                );
                                if (res.ok) {
                                  const json = await res.json();
                                  if (json && json.url) {
                                    setMessages((prev) =>
                                      prev.map(
                                        (m): Message =>
                                          m.id === message.id
                                            ? {
                                                ...m,
                                                media: m.media
                                                  ? {
                                                      ...m.media,
                                                      url: json.url,
                                                    }
                                                  : m.media,
                                                _refreshed: true,
                                              }
                                            : m
                                      )
                                    );
                                  }
                                }
                              } catch {}
                            }}
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
                      ) : message.type === "video" ? (
                        <div className="relative">
                          <video
                            key={message.id + "-video"}
                            src={message.media?.url || ""}
                            controls
                            width={400}
                            height={400}
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
                        key={message.id + "-meta"}
                        className={`text-xs mt-1 flex items-center gap-1 ${
                          isSender
                            ? "text-pink-200 justify-end"
                            : "text-gray-500"
                        }`}
                      >
                        <span>
                          {message.uploading
                            ? message.error
                              ? "Failed"
                              : "Uploading..."
                            : formatMessageTime(message.createdAt)}
                        </span>
                        {message.disappearsAt && (
                          <div className="flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            <span className="text-xs">
                              {(() => {
                                const timeLeft =
                                  new Date(message.disappearsAt).getTime() -
                                  Date.now();
                                if (timeLeft <= 0) return "Expired";
                                const seconds = Math.floor(timeLeft / 1000);
                                const minutes = Math.floor(seconds / 60);
                                const hours = Math.floor(minutes / 60);
                                const days = Math.floor(hours / 24);

                                if (days > 0) return `${days}d`;
                                if (hours > 0) return `${hours}h`;
                                if (minutes > 0) return `${minutes}m`;
                                return `${seconds}s`;
                              })()}
                            </span>
                          </div>
                        )}
                        {/* Encryption indicator removed */}
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
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3 shadow-sm z-10">
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
            <ImageIcon className="h-6 w-6" />
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
