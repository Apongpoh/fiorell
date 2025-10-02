"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { userAPI } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ArrowLeft, Heart, MessageCircle, Clock, MapPin, Shield, Star,
  Share2, MoreVertical, Flag, UserX, Users, Sparkles, ChevronRight
} from "lucide-react";
import Link from "next/link";

export default function ViewProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likePending, setLikePending] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [mutualStats, setMutualStats] = useState<any>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        // First record the view
        await userAPI.recordProfileView(id as string);
        
        // Then get the profile data
        const response = await userAPI.getProfile();
        setProfile(response.user);
      } catch (error: any) {
        setError(error.message || 'Failed to load profile');
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
      // API call here
    } catch (error) {
      setIsLiked(!isLiked); // Revert on error
    } finally {
      setLikePending(false);
    }
  };

  const nextPhoto = () => {
    if (profile?.photos?.length) {
      setCurrentPhotoIndex((prev) => (prev + 1) % profile.photos.length);
    }
  };

  const prevPhoto = () => {
    if (profile?.photos?.length) {
      setCurrentPhotoIndex((prev) => (prev - 1 + profile.photos.length) % profile.photos.length);
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
          <img
            src={profile.photos[currentPhotoIndex].url}
            alt={`${profile.firstName}'s photo ${currentPhotoIndex + 1}`}
            className="max-h-screen max-w-full object-contain"
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
                    url: window.location.href
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
              className={`p-2 rounded-full transition-all transform active:scale-90 ${isLiked ? 'bg-pink-100 text-pink-600' : 'hover:bg-gray-100'}`}
            >
              <Heart className={`h-6 w-6 ${isLiked ? 'fill-current' : ''}`} />
            </button>
            <Link
              href={`/chat/${profile?.id}`}
              className="p-2 rounded-full hover:bg-gray-100 transition-all transform active:scale-90"
            >
              <MessageCircle className="h-6 w-6" />
            </Link>
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
                <img
                  src={profile.photos[currentPhotoIndex].url}
                  alt={`${profile.firstName}'s photo ${currentPhotoIndex + 1}`}
                  className="w-full h-full object-cover cursor-zoom-in"
                  onClick={() => setShowPhotoModal(true)}
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
                      {profile.photos.map((_: any, index: number) => (
                        <button
                          key={index}
                          onClick={() => setCurrentPhotoIndex(index)}
                          className={`w-2 h-2 rounded-full transition-colors ${index === currentPhotoIndex ? 'bg-white' : 'bg-white/50'}`}
                        />
                      ))}
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
                  ? `Last active ${new Date(profile.lastSeen).toLocaleDateString()}`
                  : 'Offline'}
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
              <h2 className="text-lg font-semibold text-gray-900 mb-2">About</h2>
              <p className="text-gray-600 whitespace-pre-line">{profile.bio}</p>
            </div>
          )}

          {/* Interests Section */}
          {profile.interests && profile.interests.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Interests</h2>
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

          {/* Social Proof Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Profile Highlights</h2>
              {profile.verification?.isVerified && (
                <div className="flex items-center gap-2 text-blue-600 text-sm">
                  <Shield className="h-4 w-4" />
                  <span>Verified Account</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                <Users className="h-5 w-5 text-gray-600" />
                <div>
                  <div className="font-medium">{profile.stats?.mutualConnections || 0}</div>
                  <div className="text-sm text-gray-600">Mutual Friends</div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl">
                <Sparkles className="h-5 w-5 text-yellow-500" />
                <div>
                  <div className="font-medium">{Math.round((profile.stats?.profileCompleteness || 0) * 100)}%</div>
                  <div className="text-sm text-gray-600">Profile Score</div>
                </div>
              </div>
            </div>

            {/* Profile Completion */}
            <div className="bg-gray-50 p-4 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">Profile Completion</div>
                <div className="text-sm text-gray-600">{Math.round((profile.stats?.profileCompleteness || 0) * 100)}%</div>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-500"
                  style={{ width: `${Math.round((profile.stats?.profileCompleteness || 0) * 100)}%` }}
                />
              </div>
              {profile.stats?.profileCompleteness < 1 && (
                <button className="w-full mt-3 text-sm text-pink-600 flex items-center justify-center gap-1 hover:text-pink-700 transition-colors">
                  Complete Your Profile
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Stats Section */}
          {profile.stats && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Profile Stats</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl">
                  <div className="text-2xl font-bold text-pink-600">
                    {profile.stats.profileViews || 0}
                  </div>
                  <div className="text-sm text-gray-600">Profile Views</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl">
                  <div className="text-2xl font-bold text-pink-600">
                    {profile.stats.totalLikes || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Likes</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}