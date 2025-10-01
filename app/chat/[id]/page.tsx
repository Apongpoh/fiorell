"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Send, 
  MoreVertical,
  Phone,
  Video,
  Image as ImageIcon,
  Smile,
  Heart,
  Check,
  CheckCheck
} from "lucide-react";
import Link from "next/link";

// Mock conversation data
const mockUser = {
  id: 1,
  name: "Emma Johnson",
  photo: "/api/placeholder/100/100",
  isOnline: true,
  lastSeen: "2 minutes ago",
};

const mockMessages = [
  {
    id: 1,
    senderId: 1,
    content: "Hey! Thanks for the like 😊",
    timestamp: "2:30 PM",
    isRead: true,
    type: "text"
  },
  {
    id: 2,
    senderId: 2, // Current user
    content: "Hi Emma! I loved your photos from the hiking trip. Where was that taken?",
    timestamp: "2:32 PM",
    isRead: true,
    type: "text"
  },
  {
    id: 3,
    senderId: 1,
    content: "That was at Mount Washington! It's one of my favorite hiking spots. Do you enjoy hiking too?",
    timestamp: "2:35 PM",
    isRead: true,
    type: "text"
  },
  {
    id: 4,
    senderId: 2,
    content: "I love hiking! I've been wanting to explore more trails in the area. Would you recommend any others?",
    timestamp: "2:37 PM",
    isRead: true,
    type: "text"
  },
  {
    id: 5,
    senderId: 1,
    content: "Absolutely! There's also Bear Mountain and Storm King. Both have amazing views. Maybe we could check one out together sometime? ☕",
    timestamp: "2:40 PM",
    isRead: false,
    type: "text"
  },
];

const quickReplies = [
  "That sounds great! 😊",
  "I'd love to!",
  "When are you free?",
  "Tell me more",
  "Absolutely!",
];

export default function ChatPage() {
  const [messages, setMessages] = useState(mockMessages);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = () => {
    if (newMessage.trim()) {
      const message = {
        id: messages.length + 1,
        senderId: 2, // Current user
        content: newMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isRead: false,
        type: "text" as const
      };
      
      setMessages(prev => [...prev, message]);
      setNewMessage("");
      
      // Simulate typing indicator and response
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const responses = [
          "That's interesting!",
          "I totally agree!",
          "Sounds like a plan 😊",
          "Can't wait!",
          "You're so sweet ❤️"
        ];
        const response = {
          id: messages.length + 2,
          senderId: 1,
          content: responses[Math.floor(Math.random() * responses.length)],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isRead: false,
          type: "text" as const
        };
        setMessages(prev => [...prev, response]);
      }, 2000);
    }
  };

  const sendQuickReply = (reply: string) => {
    setNewMessage(reply);
    setTimeout(() => sendMessage(), 100);
  };

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="flex items-center space-x-3">
            <Link
              href="/matches"
              className="text-gray-600 hover:text-pink-600 transition-colors"
            >
              <ArrowLeft className="h-6 w-6" />
            </Link>
            <div className="relative">
              <img
                src={mockUser.photo}
                alt={mockUser.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              {mockUser.isOnline && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
              )}
            </div>
            <div>
              <h1 className="font-semibold text-gray-900">{mockUser.name}</h1>
              <p className="text-xs text-gray-500">
                {mockUser.isOnline ? "Online" : `Last seen ${mockUser.lastSeen}`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-600 hover:text-pink-600 transition-colors">
              <Phone className="h-5 w-5" />
            </button>
            <button className="p-2 text-gray-600 hover:text-pink-600 transition-colors">
              <Video className="h-5 w-5" />
            </button>
            <button className="p-2 text-gray-600 hover:text-pink-600 transition-colors">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 max-w-md mx-auto w-full">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex ${message.senderId === 2 ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs lg:max-w-md ${message.senderId === 2 ? 'order-2' : 'order-1'}`}>
                <div
                  className={`px-4 py-2 rounded-2xl ${
                    message.senderId === 2
                      ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
                <div className={`flex items-center mt-1 space-x-1 ${message.senderId === 2 ? 'justify-end' : 'justify-start'}`}>
                  <span className="text-xs text-gray-500">{message.timestamp}</span>
                  {message.senderId === 2 && (
                    <div className="text-gray-500">
                      {message.isRead ? (
                        <CheckCheck className="h-3 w-3" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          
          {/* Typing Indicator */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex justify-start"
              >
                <div className="bg-gray-100 rounded-2xl px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Quick Replies */}
      <div className="px-4 py-2 max-w-md mx-auto w-full">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {quickReplies.map((reply, index) => (
            <button
              key={index}
              onClick={() => sendQuickReply(reply)}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm whitespace-nowrap hover:bg-gray-200 transition-colors"
            >
              {reply}
            </button>
          ))}
        </div>
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 px-4 py-3">
        <div className="max-w-md mx-auto">
          <div className="flex items-center space-x-3">
            <button className="text-gray-400 hover:text-pink-500 transition-colors">
              <ImageIcon className="h-6 w-6" />
            </button>
            
            <div className="flex-1 relative">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="w-full px-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
              <button className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-pink-500 transition-colors">
                <Smile className="h-5 w-5" />
              </button>
            </div>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}