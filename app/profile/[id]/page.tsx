"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { userAPI } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Clock,
  MapPin,
  Shield,
  Star,
  Share2,
  MoreVertical,
  Flag,
  UserX,
  Users,
  Sparkles,
  Info,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function ViewProfilePage() {
  const { id } = useParams();
  type ProfileStats = {
    likes: number;
    matches: number;
    views: number;
    matchRate?: number;
    profileCompleteness?: number;
    profileScore?: number;
    profileBreakdown?: Record<string, number>;
    profileViews?: number;
    totalLikes?: number;
    totalLikesReceived?: number;
    totalSuperLikes?: number;
    totalSuperLikesReceived?: number;
    totalMatches?: number;
    mutualInterests?: string[];
    mutualInterestsCount?: number;
  };

  interface Profile extends Omit<import("@/models/User").IUser, "stats"> {
    age?: number;
    stats: ProfileStats;
  }

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likePending, setLikePending] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        // First record the view
        await userAPI.recordProfileView(id as string);

        // Then get the profile data
        const response = await userAPI.getUser(id as string);
        // Narrow unknown API response: expect an object with a user field
        if (
          response &&
          typeof response === "object" &&
          "user" in response &&
          (response as { user?: unknown }).user &&
          typeof (response as { user: unknown }).user === "object"
        ) {
            setProfile((response as { user: typeof profile }).user as typeof profile);
        } else {
          throw new Error("Invalid profile response shape");
        }
      } catch (error: unknown) {
        if (typeof error === "object" && error !== null && "message" in error) {
          setError(
            (error as { message?: string }).message || "Failed to load profile"
          );
        } else {
          setError("Failed to load profile");
        }
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadProfile();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
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

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Profile not found</p>
        </div>
      </div>
    );
  }

  const handleLike = async () => {
    if (likePending) return;
    try {
      setLikePending(true);
      // Toggle like status
      setIsLiked(!isLiked);
      await userAPI.likeProfile(id as string);
    } catch {
      setIsLiked(!isLiked); // Revert on error
    } finally {
      setLikePending(false);
    }
  };

  const handleStartChat = async () => {
    if (startingChat || !id) return;

    try {
      setStartingChat(true);
      setError(null);

      const response = await fetch("/api/matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("fiorell_auth_token")}`,
        },
        body: JSON.stringify({ targetUserId: id }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400 && data.matchId) {
          // Match already exists, redirect to chat
          router.push(`/chat/${data.matchId}`);
          return;
        }
        throw new Error(data.error || "Failed to start chat");
      }

      // Redirect to new chat
      router.push(`/chat/${data.match._id}`);
    } catch (error: unknown) {
      console.error("Error starting chat:", error);
      if (typeof error === "object" && error !== null && "message" in error) {
        setError(
          (error as { message?: string }).message || "Failed to start chat"
        );
      } else {
        setError("Failed to start chat");
      }
    } finally {
      setStartingChat(false);
    }
  };

  const nextPhoto = () => {
    if (profile?.photos?.length) {
      setCurrentPhotoIndex((prev) => (prev + 1) % profile.photos.length);
    }
  };

  const prevPhoto = () => {
    if (profile?.photos?.length) {
      setCurrentPhotoIndex(
        (prev) => (prev - 1 + profile.photos.length) % profile.photos.length
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Photo Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <button
            onClick={() => setShowPhotoModal(false)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          >
            <ArrowLeft className="h-6 w-6 transform rotate-90" />
          </button>
          <Image
            src={profile.photos[currentPhotoIndex].url}
            alt={`${profile.firstName}'s photo ${currentPhotoIndex + 1}`}
            width={800}
            height={800}
            className="max-h-screen max-w-full object-contain"
            priority
          />
        </div>
      )}

      {/* Actions Menu */}
      {showActionsMenu && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-end justify-center sm:items-center">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-4">
            <div className="space-y-4">
              <button
                onClick={() => {
                  // Handle share
                  navigator.share({
                    title: `${profile.firstName}'s Profile`,
                    url: window.location.href,
                  });
                  setShowActionsMenu(false);
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors"
              >
                <Share2 className="h-5 w-5 text-gray-600" />
                <span>Share Profile</span>
              </button>
              <button
                onClick={() => {
                  // Handle report
                  setShowActionsMenu(false);
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors text-yellow-600"
              >
                <Flag className="h-5 w-5" />
                <span>Report Profile</span>
              </button>
              <button
                onClick={() => {
                  // Handle block
                  setShowActionsMenu(false);
                }}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors text-red-600"
              >
                <UserX className="h-5 w-5" />
                <span>Block Profile</span>
              </button>
              <button
                onClick={() => setShowActionsMenu(false)}
                className="w-full p-3 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <header className="bg-white shadow-sm px-6 py-4 sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <Link
            href="/matches"
            className="flex items-center space-x-2 text-gray-600 hover:text-pink-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </Link>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleLike}
              disabled={likePending}
              className={`p-2 rounded-full transition-all transform active:scale-90 ${
                isLiked ? "bg-pink-100 text-pink-600" : "hover:bg-gray-100"
              }`}
            >
              <Heart className={`h-6 w-6 ${isLiked ? "fill-current" : ""}`} />
            </button>
            <button
              onClick={handleStartChat}
              disabled={startingChat}
              className="p-2 rounded-full hover:bg-gray-100 transition-all transform active:scale-90"
            >
              <MessageCircle className="h-6 w-6" />
              {startingChat && (
                <span className="absolute top-0 right-0 h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
                </span>
              )}
            </button>
            <button
              onClick={() => setShowActionsMenu(true)}
              className="p-2 rounded-full hover:bg-gray-100 transition-all transform active:scale-90"
            >
              <MoreVertical className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4">
        {/* Photos Gallery */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
          <div className="relative h-96">
            {profile.photos && profile.photos.length > 0 ? (
              <>
                <Image
                  src={profile.photos[currentPhotoIndex].url}
                  alt={`${profile.firstName}'s photo ${currentPhotoIndex + 1}`}
                  width={800}
                  height={800}
                  className="w-full h-full object-cover cursor-zoom-in"
                  onClick={() => setShowPhotoModal(true)}
                  priority
                />
                {profile.photos.length > 1 && (
                  <>
                    <button
                      onClick={prevPhoto}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full hover:bg-white transition-colors"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={nextPhoto}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full hover:bg-white transition-colors"
                    >
                      <ArrowLeft className="h-5 w-5 transform rotate-180" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                      {profile.photos.map(
                        (
                          _: {
                            url: string;
                            key: string;
                            isMain: boolean;
                            createdAt: Date;
                            _id?: string;
                          },
                          index: number
                        ) => (
                          <button
                            key={index}
                            onClick={() => setCurrentPhotoIndex(index)}
                            className={`w-2 h-2 rounded-full transition-colors ${
                              index === currentPhotoIndex
                                ? "bg-white"
                                : "bg-white/50"
                            }`}
                          />
                        )
                      )}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <span className="text-gray-400">No photos available</span>
              </div>
            )}
          </div>
        </div>

        {/* Profile Info Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                {profile.firstName}, {profile.age}
                {profile.verification?.isVerified && (
                  <Shield className="h-5 w-5 text-blue-500" />
                )}
              </h1>
              {profile.location?.city && (
                <p className="text-gray-600 flex items-center gap-2 mt-1">
                  <MapPin className="h-4 w-4" />
                  {profile.location.city}
                </p>
              )}
            </div>
            <div className="text-right text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {profile.lastSeen
                  ? `Last active ${new Date(
                      profile.lastSeen
                    ).toLocaleDateString()}`
                  : "Offline"}
              </div>
              {profile.stats?.matchRate && (
                <div className="flex items-center gap-1 mt-1">
                  <Star className="h-4 w-4 text-yellow-400" />
                  {Math.round(profile.stats.matchRate * 100)}% match rate
                </div>
              )}
            </div>
          </div>

          {/* About Section */}
          {profile.bio && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                About
              </h2>
              <p className="text-gray-600 whitespace-pre-line">{profile.bio}</p>
            </div>
          )}

          {/* Interests Section */}
          {profile.interests && profile.interests.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Interests
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest: string, index: number) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Lifestyle Section (if any) */}
          {(profile.lifestyle?.smoking ||
            profile.lifestyle?.maritalStatus ||
            profile.lifestyle?.hasKids !== undefined) && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Lifestyle
              </h2>
              <div className="flex flex-wrap gap-2">
                {profile.lifestyle?.smoking && (
                  <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm">
                    {profile.lifestyle.smoking === "no"
                      ? "Non-smoker"
                      : profile.lifestyle.smoking === "yes"
                      ? "Smoker"
                      : "Occasional Smoker"}
                  </span>
                )}
                {profile.lifestyle?.maritalStatus && (
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-sm capitalize">
                    {profile.lifestyle.maritalStatus}
                  </span>
                )}
                {profile.lifestyle?.hasKids !== undefined && (
                  <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-sm">
                    {profile.lifestyle.hasKids ? "Has Kids" : "No Kids"}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Social Proof Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Profile Highlights
              </h2>
              {profile.verification?.isVerified && (
                <div className="flex items-center gap-2 text-blue-600 text-sm">
                  <Shield className="h-4 w-4" />
                  <span>Verified Account</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl relative group">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {Math.round(
                      (profile.stats?.profileCompleteness || 0) * 100
                    )}
                    %
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-100 text-pink-600 font-semibold">
                      {profile.stats?.profileScore ??
                        Math.round(
                          (profile.stats?.profileCompleteness || 0) * 80
                        )}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 flex items-center gap-1">
                    Profile Score
                    <Info className="h-3 w-3 text-gray-400 group-hover:text-gray-600" />
                  </div>
                </div>
                {/* Tooltip */}
                <div className="absolute hidden group-hover:block top-full left-0 mt-2 w-64 z-20 bg-white border border-gray-200 rounded-lg shadow p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">
                    Breakdown
                  </p>
                  <ul className="text-[11px] space-y-0.5 text-gray-600">
                    {profile.stats?.profileBreakdown &&
                      Object.entries(profile.stats.profileBreakdown).map(
                        ([k, v]: [string, number]) => (
                          <li key={k} className="flex justify-between">
                            <span className="capitalize">{k}</span>
                            <span>{v}</span>
                          </li>
                        )
                      )}
                  </ul>
                  {(profile.stats?.profileCompleteness ?? 0) < 1 && (
                    <p className="text-[10px] text-pink-600 mt-2">
                      Add more photos, a longer bio, lifestyle details or verify
                      to increase score.
                    </p>
                  )}
                </div>
              </div>
              {profile.lifestyle?.smoking && (
                <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                  <div className="h-5 w-5 text-gray-600 flex items-center justify-center font-semibold">
                    🚭
                  </div>
                  <div>
                    <div className="font-medium">
                      {profile.lifestyle.smoking === "no"
                        ? "Non-smoker"
                        : profile.lifestyle.smoking === "yes"
                        ? "Smoker"
                        : "Occasional Smoker"}
                    </div>
                    <div className="text-sm text-gray-600">Smoking</div>
                  </div>
                </div>
              )}
              {profile.lifestyle?.maritalStatus && (
                <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                  <div className="h-5 w-5 text-gray-600 flex items-center justify-center font-semibold">
                    💍
                  </div>
                  <div>
                    <div className="font-medium capitalize">
                      {profile.lifestyle.maritalStatus}
                    </div>
                    <div className="text-sm text-gray-600">Marital Status</div>
                  </div>
                </div>
              )}
              {profile.lifestyle?.hasKids !== undefined && (
                <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                  <div className="h-5 w-5 text-gray-600 flex items-center justify-center font-semibold">
                    {profile.lifestyle.hasKids ? "👨‍👧" : "🚫"}
                  </div>
                  <div>
                    <div className="font-medium">
                      {profile.lifestyle.hasKids ? "Has Kids" : "No Kids"}
                    </div>
                    <div className="text-sm text-gray-600">Family</div>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Completion */}
            <div className="bg-gray-50 p-4 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">Profile Completion</div>
                <div className="text-sm text-gray-600">
                  {Math.round((profile.stats?.profileCompleteness || 0) * 100)}%
                </div>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500"
                  style={{
                    width: `${Math.round(
                      (profile.stats?.profileCompleteness || 0) * 100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Stats Section */}
          {profile.stats && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-pink-500" /> Profile Stats
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                    Views
                  </div>
                  <div className="text-2xl font-bold text-pink-600">
                    {profile.stats.profileViews || 0}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                    Likes
                  </div>
                  <div className="text-2xl font-bold text-pink-600">
                    {(profile.stats.totalLikes ||
                      profile.stats.totalLikesReceived ||
                      0) +
                      (profile.stats.totalSuperLikes ||
                        profile.stats.totalSuperLikesReceived ||
                        0)}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                    Matches
                  </div>
                  <div className="text-2xl font-bold text-pink-600">
                    {profile.stats.totalMatches || 0}
                  </div>
                </div>
              </div>
              {profile.stats?.mutualInterests &&
                profile.stats.mutualInterests.length > 0 && (
                  <div className="bg-white border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-800">
                        Mutual Interests ({profile.stats.mutualInterestsCount})
                      </span>
                      <span className="text-[10px] text-gray-500">Shared</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {profile.stats?.mutualInterests
                        ?.slice(0, 8)
                        .map((i: string) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full text-[11px]"
                          >
                            {i}
                          </span>
                        ))}
                      {profile.stats?.mutualInterests &&
                        profile.stats.mutualInterests.length > 8 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-[11px]">
                            +{profile.stats.mutualInterests.length - 8} more
                          </span>
                        )}
                    </div>
                  </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
