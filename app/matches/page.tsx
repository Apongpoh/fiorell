"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Heart, 
  MessageCircle, 
  ArrowLeft,
  Star,
  MapPin,
  Clock
} from "lucide-react";
import Link from "next/link";
import { useAuth, withAuth } from "@/contexts/AuthContext";
import { matchesAPI } from "@/lib/api";
import { useRouter } from "next/navigation";

// Mock matches data
const matches = [
  {
    id: 1,
    name: "Emma Johnson",
    age: 28,
    photo: "/api/placeholder/300/300",
    lastMessage: "Hey! Thanks for the like 😊",
    timestamp: "2 hours ago",
    isOnline: true,
    mutual: true,
  },
  {
    id: 2,
    name: "Sarah Williams",
    age: 26,
    photo: "/api/placeholder/300/300",
    lastMessage: "I love your taste in music!",
    timestamp: "1 day ago",
    isOnline: false,
    mutual: true,
  },
  {
    id: 3,
    name: "Jessica Brown",
    age: 30,
    photo: "/api/placeholder/300/300",
    lastMessage: "Would love to grab coffee sometime",
    timestamp: "3 days ago",
    isOnline: true,
    mutual: true,
  },
  {
    id: 4,
    name: "Amanda Davis",
    age: 27,
    photo: "/api/placeholder/300/300",
    lastMessage: "Your photos are amazing!",
    timestamp: "1 week ago",
    isOnline: false,
    mutual: true,
  },
];

const newMatches = [
  {
    id: 5,
    name: "Rachel Green",
    age: 29,
    photo: "/api/placeholder/300/300",
    matchedAt: "Just now",
  },
  {
    id: 6,
    name: "Monica Geller",
    age: 31,
    photo: "/api/placeholder/300/300",
    matchedAt: "5 minutes ago",
  },
];

export default function MatchesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'new' | 'messages'>('new');

  const handleProfileClick = (id: number) => {
    router.push(`/profile/${id}`);
  };

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
              onClick={() => setActiveTab('new')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${
                activeTab === 'new'
                  ? 'text-pink-500 border-b-2 border-pink-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              New Matches ({newMatches.length})
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${
                activeTab === 'messages'
                  ? 'text-pink-500 border-b-2 border-pink-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Messages ({matches.length})
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-md mx-auto px-6 py-6">
        {activeTab === 'new' && (
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
                  key={match.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden cursor-pointer"
                  onClick={() => handleProfileClick(match.id)}
                >
                  <div className="relative">
                    <img
                      src={match.photo}
                      alt={match.name}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-white font-semibold text-sm">
                        {match.name}
                      </h3>
                      <p className="text-white/90 text-xs">
                        Matched {match.matchedAt}
                      </p>
                    </div>
                    {/* Heart overlay */}
                    <div className="absolute top-3 right-3 bg-pink-500 rounded-full p-2">
                      <Heart className="h-4 w-4 text-white fill-current" />
                    </div>
                  </div>
                  <div className="p-3">
                    <button className="w-full bg-pink-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-pink-600 transition-colors">
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
                    key={match.id}
                    className="flex items-center space-x-3 bg-white rounded-xl p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleProfileClick(match.id)}
                  >
                    <div className="relative">
                      <img
                        src={match.photo}
                        alt={match.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      {match.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{match.name}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {match.lastMessage}
                      </p>
                    </div>
                    <div className="text-xs text-gray-400">
                      {match.timestamp}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div>
            {/* Messages List */}
            <div className="space-y-1">
              {matches.map((match, index) => (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-xl p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <img
                        src={match.photo}
                        alt={match.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      {match.isOnline && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                      {match.mutual && (
                        <div className="absolute -top-1 -right-1 bg-pink-500 rounded-full p-1">
                          <Heart className="h-3 w-3 text-white fill-current" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {match.name}
                        </h3>
                        <div className="flex items-center space-x-1 text-xs text-gray-400">
                          <Clock className="h-3 w-3" />
                          <span>{match.timestamp}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 truncate">
                        {match.lastMessage}
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-center space-y-2">
                      <button className="p-2 bg-pink-100 rounded-full hover:bg-pink-200 transition-colors">
                        <MessageCircle className="h-4 w-4 text-pink-500" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Empty State */}
            {matches.length === 0 && (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No messages yet
                </h3>
                <p className="text-gray-600 text-sm">
                  Start swiping to find your matches!
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}