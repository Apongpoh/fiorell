// components/SeeWhoLikedYou.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Eye, Star, Crown, Loader2 } from "lucide-react";
import Button from "./ui/Button";
import PremiumFeatureGate from "./PremiumFeatureGate";
import { useSubscription } from "@/hooks/useSubscription";
import { apiRequest } from "@/lib/api";
import { useToast } from "./ui/Toast";
import Image from "next/image";

interface Like {
  _id: string;
  fromUser: {
    _id: string;
    firstName: string;
    photos: Array<{
      url: string;
      isMain: boolean;
    }>;
    age: number;
    location: {
      city: string;
    };
  };
  type: "like" | "super_like";
  createdAt: string;
}

interface SeeWhoLikedYouProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export default function SeeWhoLikedYou({ 
  isOpen, 
  onClose, 
  className = "" 
}: SeeWhoLikedYouProps) {
  const [likes, setLikes] = useState<Like[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLike, setSelectedLike] = useState<Like | null>(null);
  const { canSeeWhoLikedYou } = useSubscription();
  const { showToast } = useToast();

  // Use the proper feature flag instead of subscription property
  const hasAccess = canSeeWhoLikedYou;

  const fetchLikes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/interactions/likes/received") as { likes: Like[] };
      setLikes(data.likes || []);
    } catch (error: unknown) {
      console.error("Failed to fetch likes:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      showToast({
        type: "error",
        title: "Failed to Load Likes",
        message: errorMessage || "Unable to fetch your likes. Please try again."
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isOpen && hasAccess) {
      fetchLikes();
    }
  }, [isOpen, hasAccess, fetchLikes]);

  const handleLikeBack = async (likeId: string, userId: string) => {
    try {
      const data = await apiRequest("/interactions/likes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetUserId: userId,
          action: "like"
        }),
      }) as { isMatch?: boolean };

      if (data.isMatch) {
        showToast({
          type: "success",
          title: "It's a Match! 🎉",
          message: "You can now start chatting!"
        });
      } else {
        showToast({
          type: "success",
          title: "Like Sent!",
          message: "Your like has been sent successfully."
        });
      }
      
      // Remove the like from the list
      setLikes(prev => prev.filter(like => like._id !== likeId));
      setSelectedLike(null);
    } catch (error: unknown) {
      console.error("Failed to like back:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      showToast({
        type: "error",
        title: "Failed to Send Like",
        message: errorMessage || "Unable to send like. Please try again."
      });
    }
  };

  const handlePass = async (likeId: string, userId: string) => {
    try {
      await apiRequest("/interactions/likes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetUserId: userId,
          action: "pass"
        }),
      });

      // Remove the like from the list
      setLikes(prev => prev.filter(like => like._id !== likeId));
      setSelectedLike(null);
      showToast({
        type: "info",
        title: "Passed",
        message: "Profile has been passed."
      });
    } catch (error: unknown) {
      console.error("Failed to pass:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      showToast({
        type: "error",
        title: "Failed to Pass",
        message: errorMessage || "Unable to process your decision. Please try again."
      });
    }
  };

  if (!isOpen) return null;

  return (
    <PremiumFeatureGate feature="seeWhoLikedYou">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={`bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden ${className}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-500 to-red-500 text-white p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Eye className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">See Who Liked You</h2>
                    <p className="text-pink-100 text-sm">
                      {likes.length} {likes.length === 1 ? "person has" : "people have"} liked you
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                >
                  <span className="text-lg">×</span>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-96">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
                  <span className="ml-2 text-gray-600">Loading your likes...</span>
                </div>
              ) : likes.length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    No likes yet
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Keep swiping! Your likes will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {likes.map((like) => (
                    <LikeCard
                      key={like._id}
                      like={like}
                      onLikeBack={() => handleLikeBack(like._id, like.fromUser._id)}
                      onPass={() => handlePass(like._id, like.fromUser._id)}
                      onClick={() => setSelectedLike(like)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center justify-center text-sm text-gray-500">
                <Crown className="h-4 w-4 mr-1 text-yellow-500" />
                Premium Feature • See everyone who likes you
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Detailed View Modal */}
      {selectedLike && (
        <DetailedLikeView
          like={selectedLike}
          onClose={() => setSelectedLike(null)}
          onLikeBack={() => handleLikeBack(selectedLike._id, selectedLike.fromUser._id)}
          onPass={() => handlePass(selectedLike._id, selectedLike.fromUser._id)}
        />
      )}
    </PremiumFeatureGate>
  );
}

interface LikeCardProps {
  like: Like;
  onLikeBack: () => void;
  onPass: () => void;
  onClick: () => void;
}

function LikeCard({ like, onLikeBack, onPass, onClick }: LikeCardProps) {
  const mainPhoto = like.fromUser.photos.find(p => p.isMain) || like.fromUser.photos[0];

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="relative bg-white rounded-lg shadow-md overflow-hidden cursor-pointer"
      onClick={onClick}
    >
      <div className="aspect-[3/4] relative">
        <Image
          src={mainPhoto?.url || "/api/placeholder/profile"}
          alt={like.fromUser.firstName}
          fill
          className="object-cover"
        />
        
        {like.type === "super_like" && (
          <div className="absolute top-2 right-2">
            <Star className="h-5 w-5 text-yellow-400 fill-current" />
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white p-3">
          <h3 className="font-semibold text-sm">
            {like.fromUser.firstName}, {like.fromUser.age}
          </h3>
          <p className="text-xs opacity-90">{like.fromUser.location.city}</p>
        </div>
      </div>

      <div className="p-3 flex space-x-2">
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onPass();
          }}
          variant="outline"
          className="flex-1 text-xs py-1"
        >
          Pass
        </Button>
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onLikeBack();
          }}
          className="flex-1 bg-pink-500 hover:bg-pink-600 text-xs py-1"
        >
          <Heart className="h-3 w-3 mr-1" />
          Like
        </Button>
      </div>
    </motion.div>
  );
}

interface DetailedLikeViewProps {
  like: Like;
  onClose: () => void;
  onLikeBack: () => void;
  onPass: () => void;
}

function DetailedLikeView({ like, onClose, onLikeBack, onPass }: DetailedLikeViewProps) {
  const mainPhoto = like.fromUser.photos.find(p => p.isMain) || like.fromUser.photos[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-white rounded-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="aspect-[3/4] relative">
          <Image
            src={mainPhoto?.url || "/api/placeholder/profile"}
            alt={like.fromUser.firstName}
            fill
            className="object-cover"
          />
          
          {like.type === "super_like" && (
            <div className="absolute top-4 right-4 bg-yellow-400 rounded-full p-2">
              <Star className="h-5 w-5 text-white fill-current" />
            </div>
          )}
        </div>

        <div className="p-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              {like.fromUser.firstName}, {like.fromUser.age}
            </h2>
            <p className="text-gray-600">{like.fromUser.location.city}</p>
            <p className="text-sm text-gray-500 mt-2">
              {like.type === "super_like" ? "Super liked" : "Liked"} you{" "}
              {new Date(like.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div className="flex space-x-3">
            <Button
              onClick={onPass}
              variant="outline"
              className="flex-1"
            >
              Pass
            </Button>
            <Button
              onClick={onLikeBack}
              className="flex-1 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600"
            >
              <Heart className="h-4 w-4 mr-2" />
              Like Back
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}