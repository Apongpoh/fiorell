"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { MessageCircle, Users, Heart, Camera } from "lucide-react";
import Link from "next/link";

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  read: boolean;
}

interface ChatPreview {
  userId: string;
  firstName: string;
  photo?: string;
  defaultPhoto?: string;
  lastMessage?: {
    content: string;
    createdAt: string;
    isRead: boolean;
  };
}

export default function MessagesPage() {
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const loadChats = async () => {
      try {
        setLoading(true);
        // TODO: Implement API call to fetch chats
        // const response = await messagesAPI.getChats();
        // setChats(response.chats);
        
        // Placeholder data for now
        setChats([
          {
            userId: "1",
            firstName: "Sarah",
            photo: "/placeholder-profile.jpg",
            lastMessage: {
              content: "Hey, how are you?",
              createdAt: new Date().toISOString(),
              isRead: false
            }
          },
          // Add more placeholder chats here
        ]);
      } catch (error) {
        setError("Failed to load messages");
      } finally {
        setLoading(false);
      }
    };

    loadChats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600"
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
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        </div>
      </header>

      {/* Chat List */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="space-y-2">
          {chats.map((chat) => (
            <button
              key={chat.userId}
              onClick={() => router.push(`/chat/${chat.userId}`)}
              className="w-full bg-white rounded-lg shadow p-4 flex items-center space-x-4 hover:bg-gray-50 transition-colors"
            >
              {/* Profile Picture */}
              <div className="flex-shrink-0">
                <img
                  src={chat.photo || chat.defaultPhoto || "/api/placeholder/profile"}
                  alt={chat.firstName}
                  className="h-12 w-12 rounded-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/api/placeholder/profile";
                  }}
                />
              </div>

              {/* Chat Preview */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {chat.firstName}
                  </p>
                  {chat.lastMessage && (
                    <p className="text-xs text-gray-500">
                      {new Date(chat.lastMessage.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {chat.lastMessage && (
                  <p className="text-sm text-gray-500 truncate">
                    {chat.lastMessage.content}
                  </p>
                )}
              </div>

              {/* Unread Indicator */}
              {chat.lastMessage && !chat.lastMessage.isRead && (
                <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
              )}
            </button>
          ))}

          {chats.length === 0 && (
            <div className="text-center py-12">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No messages yet</h3>
              <p className="text-gray-500">Start matching with people to begin conversations</p>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex items-center justify-around max-w-md mx-auto">
          <button 
            onClick={() => router.push('/dashboard')}
            className="flex flex-col items-center space-y-1 text-gray-400 hover:text-pink-500 transition-colors"
          >
            <Users className="h-6 w-6" />
            <span className="text-xs">Discover</span>
          </button>
          <button 
            onClick={() => router.push('/matches')}
            className="flex flex-col items-center space-y-1 text-gray-400 hover:text-pink-500 transition-colors"
          >
            <Heart className="h-6 w-6" />
            <span className="text-xs">Likes</span>
          </button>
          <button 
            onClick={() => router.push('/chat')}
            className="flex flex-col items-center space-y-1 text-pink-500"
          >
            <MessageCircle className="h-6 w-6" />
            <span className="text-xs">Messages</span>
          </button>
          <button 
            onClick={() => router.push('/profile')}
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