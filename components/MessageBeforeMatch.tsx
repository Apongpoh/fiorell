// components/MessageBeforeMatch.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Send, X, MessageCircle, Sparkles } from "lucide-react";
import Button from "./ui/Button";
import PremiumFeatureGate from "./PremiumFeatureGate";
import { useToast } from "./ui/Toast";

interface MessageBeforeMatchProps {
  profile: {
    id: string;
    name: string;
    photo: string;
    age: number;
    bio?: string;
  };
  onSend: (message: string) => void;
  onSkip: () => void;
  onClose: () => void;
}

const suggestionPrompts = [
  "I noticed we both love [shared interest]. What got you into it?",
  "Your travel photos are amazing! What's been your favorite destination?",
  "I see you're into [hobby/interest]. Any recommendations for a beginner?",
  "Your profile caught my eye because [specific reason]. Tell me more!",
  "I love your taste in [music/books/movies]. Any recent favorites?",
  "We seem to have a lot in common! What's something that always makes you smile?"
];

const quickMessages = [
  "Hey! I'd love to get to know you better. What's your favorite way to spend a weekend?",
  "Hi there! Your profile really caught my attention. What's something you're passionate about?",
  "Hello! I noticed we have similar interests. Would love to chat and see if we connect!",
  "Hey! You seem like someone I'd really enjoy talking to. What's been the highlight of your week?"
];

export default function MessageBeforeMatch({
  profile,
  onSend,
  onSkip,
  onClose
}: MessageBeforeMatchProps) {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const { showToast } = useToast();

  const handleSend = async () => {
    if (!message.trim()) {
      showToast({
        type: "error",
        title: "Empty Message",
        message: "Please write a message before sending."
      });
      return;
    }

    if (message.length < 10) {
      showToast({
        type: "error",
        title: "Message Too Short",
        message: "Please write a more thoughtful message (at least 10 characters)."
      });
      return;
    }

    setIsSending(true);

    try {
      await onSend(message);
      showToast({
        type: "success",
        title: "Message Sent!",
        message: `Your message has been sent to ${profile.name}. They'll be notified of your interest!`
      });
      onClose();
    } catch {
      showToast({
        type: "error",
        title: "Failed to Send",
        message: "There was an error sending your message. Please try again."
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickMessage = (quickMessage: string) => {
    setMessage(quickMessage);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion);
  };

  return (
    <PremiumFeatureGate feature="messageBeforeMatch">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white p-6 relative flex-shrink-0">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center space-x-4">
              <Image
                src={profile.photo}
                alt={profile.name}
                width={64}
                height={64}
                className="w-16 h-16 rounded-full object-cover border-3 border-white/20"
              />
              <div>
                <h2 className="text-xl font-bold flex items-center space-x-2">
                  <span>{profile.name}</span>
                  <Sparkles className="h-5 w-5 text-yellow-300" />
                </h2>
                <p className="text-pink-100 text-sm">
                  Stand out with a personalized message!
                </p>
              </div>
            </div>
          </div>

          {/* Content - Scrollable */}
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            {/* Premium Feature Info */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Message Before Match</h3>
                  <p className="text-sm text-gray-600">
                    Send a thoughtful message and skip the matching process entirely!
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Messages */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Messages</h3>
              <div className="space-y-2">
                {quickMessages.map((quickMessage, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickMessage(quickMessage)}
                    className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors"
                  >
                    {quickMessage}
                  </button>
                ))}
              </div>
            </div>

            {/* Suggestion Prompts */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Message Ideas</h3>
              <div className="space-y-2">
                {suggestionPrompts.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg text-sm transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write a thoughtful, personalized message that shows you've read their profile..."
                className="w-full p-4 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                rows={4}
                maxLength={500}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-500">
                  Minimum 10 characters
                </span>
                <span className="text-xs text-gray-500">
                  {message.length}/500
                </span>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h4 className="font-semibold text-amber-800 mb-2">💡 Tips for Success</h4>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>• Reference something specific from their profile</li>
                <li>• Ask an engaging question</li>
                <li>• Be genuine and authentic</li>
                <li>• Keep it positive and fun</li>
              </ul>
            </div>
          </div>

          {/* Footer - Fixed at bottom */}
          <div className="border-t border-gray-200 p-4 space-y-3 flex-shrink-0">
            <Button
              onClick={handleSend}
              disabled={!message.trim() || message.length < 10 || isSending}
              className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Sending...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Send className="h-4 w-4" />
                  <span>Send Message</span>
                </div>
              )}
            </Button>

            <button
              onClick={onSkip}
              className="w-full p-3 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
            >
              Skip and Like Normally
            </button>
          </div>
        </motion.div>
      </motion.div>
    </PremiumFeatureGate>
  );
}