"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { MessageCircle, Users, Heart, Camera } from "lucide-react";
import { apiRequest } from "@/lib/api";
// Removed unused Link and Message

interface ChatPreview {
  matchId: string;
  userId: string;
  firstName: string;
  photo?: string;
  defaultPhoto?: string;
  lastMessage?: {
    content: string;
    createdAt: string;
    isRead: boolean;
  };
  unreadCount: number;
  lastMessageAt?: string | null;
}

export default function MessagesPage() {
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const router = useRouter();
  const { user } = useAuth();

  const handleRetry = () => {
    setError(null);
    setRetryCount((prev) => prev + 1);
  };

  useEffect(() => {
    const loadChats = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        const response = await apiRequest("/matches");
        if (!response || typeof response !== 'object' || !('matches' in response)) {
          throw new Error('Invalid response from server');
        }
        const matchesValue = (response as { matches?: unknown }).matches;
        if (!Array.isArray(matchesValue)) {
          throw new Error('Invalid matches data');
        }

        // The current API returns matches with shape: { _id, user: {...}, lastMessage, unreadCount, ... }
        // but we also keep backward compatibility if user1/user2 are present.
  const validChats: ChatPreview[] = (matchesValue as unknown[])
          .map((rawMatch) => {
            if (typeof rawMatch !== "object" || rawMatch === null) {
              return null;
            }
            const match = rawMatch as {
              _id?: string;
              user?: unknown;
              user1?: unknown;
              user2?: unknown;
              lastMessage?: unknown;
              unreadCount?: number;
              lastMessageAt?: string;
              matchedAt?: string;
            };
            function isUserObject(u: unknown): u is {
              _id: string;
              firstName?: string;
              photos?: { url: string }[];
            } {
              return (
                typeof u === "object" &&
                u !== null &&
                "_id" in u &&
                typeof (u as { _id?: unknown })._id === "string"
              );
            }
            let otherUser: {
              _id: string;
              firstName?: string;
              photos?: { url: string }[];
            } | null = null;
            if (isUserObject(match.user)) {
              otherUser = match.user;
            } else if (isUserObject(match.user1) && isUserObject(match.user2)) {
              otherUser =
                match.user1._id === user.id ? match.user2 : match.user1;
            }
            if (!otherUser) return null;
            const lastMsg =
              typeof match.lastMessage === "object" &&
              match.lastMessage !== null
                ? (match.lastMessage as {
                    content?: string;
                    createdAt?: string;
                    readStatus?: { isRead?: boolean };
                  })
                : undefined;
            return {
              matchId: match._id ?? "",
              userId: otherUser._id,
              firstName: otherUser.firstName ?? "",
              photo: otherUser.photos?.[0]?.url || "/api/placeholder/profile",
              lastMessage:
                lastMsg && lastMsg.content
                  ? {
                      content: lastMsg.content,
                      createdAt: lastMsg.createdAt ?? "",
                      isRead: lastMsg.readStatus?.isRead ?? false,
                    }
                  : undefined,
              unreadCount:
                typeof match.unreadCount === "number" ? match.unreadCount : 0,
              lastMessageAt:
                typeof match.lastMessageAt === "string"
                  ? match.lastMessageAt
                  : typeof match.matchedAt === "string"
                  ? match.matchedAt
                  : null,
            } as ChatPreview;
          })
          .filter((chat): chat is ChatPreview => chat !== null)
          .sort((a: ChatPreview, b: ChatPreview) => {
            // Sort by lastMessageAt descending
            const aTime = a.lastMessageAt
              ? new Date(a.lastMessageAt).getTime()
              : 0;
            const bTime = b.lastMessageAt
              ? new Date(b.lastMessageAt).getTime()
              : 0;
            return bTime - aTime;
          });

        setChats(validChats);
      } catch (error: unknown) {
        let errorMessage = "Failed to load messages";
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

    loadChats();
  }, [retryCount, user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            Messages
            {chats.some((c) => c.unreadCount > 0) && (
              <span className="text-xs bg-pink-500 text-white px-2 py-0.5 rounded-full font-medium">
                {chats.reduce((sum, c) => sum + c.unreadCount, 0) > 99
                  ? "99+"
                  : chats.reduce((sum, c) => sum + c.unreadCount, 0)}
              </span>
            )}
          </h1>
          {chats.length > 0 && (
            <button
              onClick={() => setRetryCount((r) => r + 1)}
              className="text-xs text-pink-500 hover:text-pink-600 font-medium"
            >
              Refresh
            </button>
          )}
        </div>
      </header>

      {/* Chat List */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="space-y-2">
          {chats.map((chat) => (
            <button
              key={chat.userId}
              onClick={() => router.push(`/chat/${chat.matchId}`)}
              className="w-full bg-white rounded-lg shadow p-4 flex items-center space-x-4 hover:bg-gray-50 transition-colors"
            >
              {/* Profile Picture */}
              <div className="flex-shrink-0">
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      chat.photo ||
                      chat.defaultPhoto ||
                      "/api/placeholder/profile"
                    }
                    alt={chat.firstName || "Profile photo"}
                    className="h-12 w-12 rounded-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/api/placeholder/profile";
                    }}
                  />
                </>
              </div>

              {/* Chat Preview */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p
                    className={`text-sm truncate ${
                      chat.unreadCount > 0
                        ? "font-semibold text-gray-900"
                        : "font-medium text-gray-900"
                    }`}
                  >
                    {chat.firstName}
                  </p>
                  {(chat.lastMessageAt || chat.lastMessage) && (
                    <p className="text-xs text-gray-500">
                      {new Date(
                        chat.lastMessageAt ||
                          chat.lastMessage?.createdAt ||
                          Date.now()
                      ).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {chat.lastMessage && (
                  <p
                    className={`text-sm truncate ${
                      chat.unreadCount > 0 && !chat.lastMessage.isRead
                        ? "text-gray-900 font-semibold"
                        : "text-gray-500"
                    }`}
                  >
                    {chat.lastMessage.content}
                  </p>
                )}
              </div>

              {/* Unread Count Badge */}
              {chat.unreadCount > 0 && (
                <div className="flex items-center">
                  <span className="min-w-[1.5rem] px-2 py-1 bg-pink-500 text-white text-xs rounded-full text-center font-semibold">
                    {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                  </span>
                </div>
              )}
            </button>
          ))}

          {chats.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No conversations yet
              </h3>
              <p className="text-gray-500 mb-4">
                Start matching with people to begin conversations
              </p>
              <button
                onClick={() => router.push("/dashboard")}
                className="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition-colors"
              >
                Find Matches
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex items-center justify-around max-w-md mx-auto">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex flex-col items-center space-y-1 text-gray-400 hover:text-pink-500 transition-colors"
          >
            <Users className="h-6 w-6" />
            <span className="text-xs">Discover</span>
          </button>
          <button
            onClick={() => router.push("/matches")}
            className="flex flex-col items-center space-y-1 text-gray-400 hover:text-pink-500 transition-colors"
          >
            <Heart className="h-6 w-6" />
            <span className="text-xs">Likes</span>
          </button>
          <button
            onClick={() => router.push("/chat")}
            className="flex flex-col items-center space-y-1 text-pink-500"
          >
            <MessageCircle className="h-6 w-6" />
            <span className="text-xs">Messages</span>
          </button>
          <button
            onClick={() => router.push("/profile")}
            className="flex flex-col items-center space-y-1 text-gray-400 hover:text-pink-500 transition-colors"
          >
            <Camera className="h-6 w-6" />
            <span className="text-xs">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
