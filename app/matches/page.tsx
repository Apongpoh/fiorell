"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

interface Match {
  _id: string;
  user: {
    _id: string;
    firstName: string;
    age: number;
    photos: Array<{ url: string }>;
    lastSeen?: Date;
    verification: {
      isVerified: boolean;
    };
  };
  lastMessage?: {
    _id: string;
    content: string;
    type: string;
    sender: string;
    createdAt: string;
    readStatus: {
      isRead: boolean;
    };
  };
  unreadCount: number;
  matchedAt: string;
  lastMessageAt?: string;
}

export default function MatchesPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [newMatches, setNewMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"new" | "messages">("new");

  useEffect(() => {
    const loadMatches = async () => {
      try {
        setLoading(true);
        const data = await apiRequest("/matches");
        if (!data || typeof data !== 'object' || !('matches' in data)) {
          throw new Error('Invalid matches response');
        }
        const matchesVal = (data as { matches?: unknown }).matches;
        if (!Array.isArray(matchesVal)) {
          throw new Error('Invalid matches data');
        }

        // Split matches into new and existing conversations
        const now = new Date();
        const oneDay = 24 * 60 * 60 * 1000; // one day in milliseconds

        const { new: newOnes, existing } = (matchesVal as Match[]).reduce(
          (acc: { new: Match[]; existing: Match[] }, match: Match) => {
            const matchDate = new Date(match.matchedAt);
            if (
              now.getTime() - matchDate.getTime() < oneDay &&
              !match.lastMessage
            ) {
              acc.new.push(match);
            } else {
              acc.existing.push(match);
            }
            return acc;
          },
          { new: [], existing: [] }
        );

        setNewMatches(newOnes);
        setMatches(existing);
      } catch {
        setError("An unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    loadMatches();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading matches...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <Link
            href="/dashboard"
            className="flex items-center space-x-2 text-gray-600 hover:text-pink-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </Link>
          <div className="flex items-center space-x-2">
            <Heart className="h-6 w-6 text-pink-500" />
            <span className="text-xl font-bold text-gray-900">Matches</span>
          </div>
          <div className="w-6"></div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-md mx-auto px-6">
          <div className="flex">
            <button
              onClick={() => setActiveTab("new")}
              className={`flex-1 py-4 text-center font-medium transition-colors ${
                activeTab === "new"
                  ? "text-pink-500 border-b-2 border-pink-500"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              New Matches ({newMatches.length})
            </button>
            <button
              onClick={() => setActiveTab("messages")}
              className={`flex-1 py-4 text-center font-medium transition-colors ${
                activeTab === "messages"
                  ? "text-pink-500 border-b-2 border-pink-500"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Messages ({matches.length})
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-md mx-auto px-6 py-6">
        {activeTab === "new" && (
          <div>
            {/* New Matches Header */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                🎉 You have new matches!
              </h2>
              <p className="text-gray-600 text-sm">
                Start a conversation and see where it goes
              </p>
            </div>

            {/* New Matches Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {newMatches.map((match, index) => (
                <motion.div
                  key={match._id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden"
                >
                  <div className="relative">
                    <Image
                      src={
                        match.user?.photos?.[0]?.url ||
                        "/api/placeholder/profile"
                      }
                      alt={match.user?.firstName || "User"}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/api/placeholder/profile";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-semibold text-sm">
                          {match.user.firstName}
                        </h3>
                        {match.user.verification.isVerified && (
                          <Shield className="h-4 w-4 text-blue-400" />
                        )}
                      </div>
                      <p className="text-white/90 text-xs">
                        Matched {formatDistanceToNow(new Date(match.matchedAt))}{" "}
                        ago
                      </p>
                    </div>
                    {/* Heart overlay */}
                    <div className="absolute top-3 right-3 bg-pink-500 rounded-full p-2">
                      <Heart className="h-4 w-4 text-white fill-current" />
                    </div>
                  </div>
                  <div className="p-3">
                    <button
                      onClick={() => router.push(`/chat/${match._id}`)}
                      className="w-full bg-pink-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-pink-600 transition-colors"
                    >
                      Say Hello
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Recent Activity
              </h3>
              <div className="space-y-3">
                {matches.slice(0, 3).map((match) => (
                  <div
                    key={match._id}
                    onClick={() => router.push(`/chat/${match._id}`)}
                    className="flex items-center space-x-3 bg-white rounded-xl p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="relative">
                      <Image
                        src={
                          match.user.photos[0]?.url ||
                          "/api/placeholder/profile"
                        }
                        alt={match.user.firstName}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      {match.user.lastSeen &&
                        Date.now() - new Date(match.user.lastSeen).getTime() <
                          5 * 60 * 1000 && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">
                          {match.user.firstName}
                        </h4>
                        {match.user.verification.isVerified && (
                          <Shield className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      {match.lastMessage && (
                        <p className="text-sm text-gray-600 truncate">
                          {match.lastMessage.content}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {match.lastMessage
                          ? formatDistanceToNow(
                              new Date(match.lastMessage.createdAt)
                            ) + " ago"
                          : formatDistanceToNow(new Date(match.matchedAt)) +
                            " ago"}
                      </p>
                      {match.unreadCount > 0 && (
                        <div className="mt-1 bg-pink-500 text-white text-xs rounded-full px-2 py-0.5 inline-block">
                          {match.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "messages" && (
          <div className="space-y-3">
            {matches.map((match) => (
              <div
                key={match._id}
                onClick={() => router.push(`/chat/${match._id}`)}
                className="flex items-center space-x-3 bg-white rounded-xl p-3 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="relative">
                  <Image
                    src={
                      match.user.photos[0]?.url || "/api/placeholder/profile"
                    }
                    alt={match.user.firstName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  {match.user.lastSeen &&
                    Date.now() - new Date(match.user.lastSeen).getTime() <
                      5 * 60 * 1000 && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">
                      {match.user.firstName}
                    </h4>
                    {match.user.verification.isVerified && (
                      <Shield className="h-4 w-4 text-blue-500" />
                    )}
                  </div>
                  {match.lastMessage && (
                    <p className="text-sm text-gray-600 truncate">
                      {match.lastMessage.content}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {match.lastMessage
                      ? formatDistanceToNow(
                          new Date(match.lastMessage.createdAt)
                        ) + " ago"
                      : formatDistanceToNow(new Date(match.matchedAt)) + " ago"}
                  </p>
                  {match.unreadCount > 0 && (
                    <div className="mt-1 bg-pink-500 text-white text-xs rounded-full px-2 py-0.5 inline-block">
                      {match.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
