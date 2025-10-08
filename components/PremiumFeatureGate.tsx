// components/PremiumFeatureGate.tsx
"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Crown, 
  Lock, 
  Star, 
  Zap, 
  Eye, 
  MapPin, 
  MessageCircle, 
  Filter,
  Heart,
  RotateCcw
} from "lucide-react";
import Button from "./ui/Button";
import { useSubscription, canAccessPremiumFeature } from "@/hooks/useSubscription";
import { useToast } from "./ui/Toast";
import { useRouter } from "next/navigation";

interface PremiumFeatureGateProps {
  feature: 
    | "seeWhoLikedYou"
    | "unlimitedLikes" 
    | "superLikes"
    | "boosts"
    | "travelMode"
    | "readReceipts"
    | "incognitoMode"
    | "prioritySupport"
    | "profileControl"
    | "advancedFilters"
    | "messageBeforeMatch"
    | "undoSwipe"
    | "adFree";
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
  className?: string;
}

const featureConfig = {
  seeWhoLikedYou: {
    icon: Eye,
    title: "See Who Liked You",
    description: "Discover everyone who's interested in you instantly",
    requiresPremiumPlus: false,
    benefits: [
      "See all your likes instantly",
      "No more guessing games",
      "Match with confidence",
      "Save time browsing"
    ]
  },
  unlimitedLikes: {
    icon: Heart,
    title: "Unlimited Likes", 
    description: "Like as many profiles as you want",
    requiresPremiumPlus: false,
    benefits: [
      "No daily limits",
      "Like unlimited profiles",
      "More chances to match",
      "Express interest freely"
    ]
  },
  superLikes: {
    icon: Star,
    title: "Super Likes",
    description: "Get 3x more attention with Super Likes",
    requiresPremiumPlus: false,
    benefits: [
      "Stand out from the crowd",
      "3x higher match rate",
      "Show serious interest",
      "Get noticed first"
    ]
  },
  boosts: {
    icon: Zap,
    title: "Profile Boosts",
    description: "Be the top profile in your area for 30 minutes",
    requiresPremiumPlus: false,
    benefits: [
      "10x more profile views",
      "Priority in discovery",
      "Instant visibility boost",
      "Perfect timing control"
    ]
  },
  travelMode: {
    icon: MapPin,
    title: "Travel Mode",
    description: "Connect with people anywhere in the world",
    requiresPremiumPlus: true,
    benefits: [
      "Date before you travel",
      "Connect globally",
      "Plan meetups ahead",
      "Unlimited locations"
    ]
  },
  readReceipts: {
    icon: MessageCircle,
    title: "Read Receipts",
    description: "Know when your messages are read",
    requiresPremiumPlus: false,
    benefits: [
      "See message status",
      "Know engagement level",
      "Time your follow-ups",
      "Better conversations"
    ]
  },
  incognitoMode: {
    icon: Lock,
    title: "Incognito Mode",
    description: "Browse privately without being seen",
    requiresPremiumPlus: true,
    benefits: [
      "Browse anonymously",
      "Control your visibility",
      "Selective matching",
      "Complete privacy"
    ]
  },
  prioritySupport: {
    icon: Crown,
    title: "Priority Support",
    description: "Get help faster with VIP support",
    requiresPremiumPlus: true,
    benefits: [
      "24/7 premium support",
      "Faster response times", 
      "Dedicated support team",
      "Priority issue resolution"
    ]
  },
  profileControl: {
    icon: Crown,
    title: "Profile Control",
    description: "Advanced profile management tools",
    requiresPremiumPlus: false,
    benefits: [
      "Photo verification",
      "Profile optimization tips",
      "Advanced privacy controls",
      "Profile analytics"
    ]
  },
  advancedFilters: {
    icon: Filter,
    title: "Advanced Filters",
    description: "Find exactly who you're looking for",
    requiresPremiumPlus: false,
    benefits: [
      "Height, education filters",
      "Lifestyle preferences",
      "Interest matching",
      "Compatibility scores"
    ]
  },
  messageBeforeMatch: {
    icon: MessageCircle,
    title: "Message Before Match",
    description: "Send a message with your like",
    requiresPremiumPlus: true,
    benefits: [
      "Break the ice first",
      "Stand out with messages",
      "Higher response rates",
      "Make great first impressions"
    ]
  },
  undoSwipe: {
    icon: RotateCcw,
    title: "Undo Swipe",
    description: "Take back accidental swipes",
    requiresPremiumPlus: false,
    benefits: [
      "Fix mistakes instantly",
      "Never miss a match",
      "Unlimited rewinds",
      "Second chances"
    ]
  },
  adFree: {
    icon: Crown,
    title: "Ad-Free Experience",
    description: "Enjoy the app without any ads",
    requiresPremiumPlus: false,
    benefits: [
      "No interruptions",
      "Faster app performance",
      "Clean interface",
      "Better user experience"
    ]
  }
};

export default function PremiumFeatureGate({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
  className = ""
}: PremiumFeatureGateProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const { subscription, loading } = useSubscription();
  const { showToast } = useToast();
  const router = useRouter();

  const config = featureConfig[feature];
  const hasAccess = canAccessPremiumFeature(subscription, feature);

  const handleUpgrade = () => {
    router.push("/subscription");
    setShowPrompt(false);
  };

  const handleFeatureClick = () => {
    if (!hasAccess && showUpgradePrompt) {
      setShowPrompt(true);
    } else if (!hasAccess) {
      showToast({
        type: "warning",
        title: `${config.title} is Premium`,
        message: `Upgrade to ${config.requiresPremiumPlus ? "Premium Plus" : "Premium"} to access this feature`,
        action: {
          label: "Upgrade Now",
          onClick: () => router.push("/subscription")
        }
      });
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-gray-200 rounded-lg h-20"></div>
      </div>
    );
  }

  if (hasAccess) {
    return <div className={className}>{children}</div>;
  }

  if (fallback) {
    return (
      <div className={className} onClick={handleFeatureClick}>
        {fallback}
        <UpgradePrompt
          isOpen={showPrompt}
          onClose={() => setShowPrompt(false)}
          config={config}
          onUpgrade={handleUpgrade}
        />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="opacity-50 pointer-events-none blur-sm">
        {children}
      </div>
      
      <div
        className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg cursor-pointer backdrop-blur-sm border-2 border-dashed border-purple-300 hover:border-purple-400 transition-colors"
        onClick={handleFeatureClick}
      >
        <div className="text-center p-4">
          <div className="mx-auto w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-2">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <p className="text-sm font-semibold text-gray-700 mb-1">
            {config.title}
          </p>
          <p className="text-xs text-gray-500">
            {config.requiresPremiumPlus ? "Premium Plus" : "Premium"} Feature
          </p>
        </div>
      </div>

      <UpgradePrompt
        isOpen={showPrompt}
        onClose={() => setShowPrompt(false)}
        config={config}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
}

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  config: typeof featureConfig[keyof typeof featureConfig];
  onUpgrade: () => void;
}

function UpgradePrompt({ isOpen, onClose, config, onUpgrade }: UpgradePromptProps) {
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                config.requiresPremiumPlus
                  ? "bg-gradient-to-r from-purple-500 to-pink-500"
                  : "bg-gradient-to-r from-blue-500 to-indigo-500"
              }`}>
                <Icon className="h-8 w-8 text-white" />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {config.title}
              </h3>
              
              <p className="text-gray-600 text-sm mb-4">
                {config.description}
              </p>

              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                config.requiresPremiumPlus
                  ? "bg-purple-100 text-purple-800"
                  : "bg-blue-100 text-blue-800"
              }`}>
                <Crown className="h-3 w-3 mr-1" />
                {config.requiresPremiumPlus ? "Premium Plus" : "Premium"} Feature
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                What you&apos;ll get:
              </h4>
              <ul className="space-y-2">
                {config.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start text-sm text-gray-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-2 mr-3 flex-shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3">
              <Button
                onClick={onUpgrade}
                className={`w-full ${
                  config.requiresPremiumPlus
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                    : "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                }`}
              >
                Upgrade to {config.requiresPremiumPlus ? "Premium Plus" : "Premium"}
              </Button>
              
              <Button
                onClick={onClose}
                variant="outline"
                className="w-full"
              >
                Maybe Later
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}