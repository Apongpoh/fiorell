"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Heart, 
  X, 
  Star, 
  MapPin, 
  Users, 
  MessageCircle, 
  Settings,
  Filter,
  Camera
} from "lucide-react";
import { useAuth, withAuth } from "@/contexts/AuthContext";
import { discoveryAPI, interactionsAPI, matchesAPI, userAPI, statsAPI } from "@/lib/api";
import { useRouter } from "next/navigation";

interface Profile {
  id: string;
  firstName: string;
  age: number;
  location: { city: string };
  bio: string;
  interests: string[];
  photos: Array<{ url: string; isMain: boolean }>;
  verification: { isVerified: boolean };
  compatibilityScore: number;
  commonInterests: string[];
}

function DashboardPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [dragDirection, setDragDirection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [currentMatch, setCurrentMatch] = useState<Profile | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [stats, setStats] = useState({ likesToday: 0, matches: 0, messages: 0 });
  const [statsLoading, setStatsLoading] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
  const { user, logout } = useAuth();
  const router = useRouter();

  // Load current user profile
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setUserLoading(true);
        const response = await userAPI.getProfile();
        setCurrentUser(response.user);
      } catch (error: any) {
        console.error('Failed to load user profile:', error);
        // If auth fails, redirect to login
        if (error.message.includes('Unauthorized')) {
          logout();
        }
      } finally {
        setUserLoading(false);
      }
    };

    loadUserProfile();
  }, [logout]);

  // Load potential matches
  useEffect(() => {
    const loadMatches = async () => {
      try {
        setLoading(true);
        const response = await discoveryAPI.getMatches(10, 0);
        setProfiles(response.matches || []);
      } catch (error: any) {
        setError(error.message || 'Failed to load matches');
      } finally {
        setLoading(false);
      }
    };

    loadMatches();
  }, []);

    // Fetch stats from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoadingStats(true);
        const data = await statsAPI.getUserStats();
        setStats({
          likesToday: data.likesToday || 0,
          matches: data.matches || 0,
          messages: data.messages || 0
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        // Fallback to default values
        setStats({
          likesToday: 5,
          matches: 3,
          messages: 8
        });
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  // Reset photo index when profile changes
  useEffect(() => {
    setPhotoIndex(0);
  }, [currentProfileIndex]);

  const currentProfile = profiles[currentProfileIndex];

  const advancePhoto = () => {
    if (!currentProfile || currentProfile.photos.length <= 1) return;
    setPhotoIndex(prev => (prev + 1) % currentProfile.photos.length);
  };

    const handleSwipe = async (direction: 'left' | 'right' | 'up') => {
    if (profiles.length === 0 || !currentUser) return;

    const currentProfile = profiles[currentProfileIndex];
    const action = direction === 'left' ? 'pass' : direction === 'up' ? 'super_like' : 'like';

    try {
      // Record the swipe interaction with real user ID
      const response = await interactionsAPI.recordSwipe(currentUser.id, currentProfile.id, action);
      
      // Check if it's a match
      if (response.match) {
        setCurrentMatch(currentProfile);
        setShowMatchModal(true);
      }

      // Update stats if it was a like
      if (action === 'like' || action === 'super_like') {
        setStats(prev => ({
          ...prev,
          likesToday: prev.likesToday + 1
        }));
      }
    } catch (error) {
      console.error('Failed to record swipe:', error);
    }

    // Move to next profile
    if (currentProfileIndex < profiles.length - 1) {
      setCurrentProfileIndex(prev => prev + 1);
      setCurrentPhotoIndex(0); // Reset photo index for new profile
    } else {
      // Load more profiles or show end message
      setCurrentProfileIndex(0);
    }
  };

  const loadMoreProfiles = async () => {
    try {
      const response = await discoveryAPI.getMatches(10, profiles.length);
      setProfiles(prev => [...prev, ...(response.matches || [])]);
    } catch (error) {
      console.error('Failed to load more profiles:', error);
    }
  };

  const handleLike = () => handleSwipe('right');
  const handleSuperLike = () => handleSwipe('up');
  const handlePass = () => handleSwipe('left');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Finding your perfect matches...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
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

  if (!profiles.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Heart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No more profiles</h2>
          <p className="text-gray-600 mb-4">Check back later for new matches!</p>
          <button 
            onClick={() => router.push('/matches')} 
            className="bg-pink-500 text-white px-6 py-3 rounded-lg hover:bg-pink-600"
          >
            View Your Matches
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-2">
            <Heart className="h-8 w-8 text-pink-500" />
            <span className="text-2xl font-bold text-gray-900">Fiorell</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-600 hover:text-pink-600 transition-colors">
              <Filter className="h-6 w-6" />
            </button>
            <button 
              onClick={() => router.push('/matches')}
              className="p-2 text-gray-600 hover:text-pink-600 transition-colors"
            >
              <MessageCircle className="h-6 w-6" />
            </button>
            <button 
              onClick={() => router.push('/profile')}
              className="w-8 h-8 bg-pink-500 cursor-pointer rounded-full flex items-center justify-center hover:bg-pink-600 transition-colors"
              title="Profile"
            >
              <span className="text-white font-semibold text-sm">
                {(currentUser?.firstName || user?.firstName)?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6">
        <div className="relative h-[600px] mb-6">
          <AnimatePresence mode="wait">
            {currentProfile && (
              <motion.div
                key={currentProfile.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  opacity: 1,
                  x: dragDirection === 'left' ? -300 : dragDirection === 'right' ? 300 : 0,
                  rotate: dragDirection === 'left' ? -30 : dragDirection === 'right' ? 30 : 0
                }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-white rounded-2xl shadow-xl overflow-hidden"
              >
                {/* Profile Image */}
                <div className="relative h-3/4 cursor-pointer" onClick={advancePhoto}>
                  <img
                    src={currentProfile.photos[photoIndex]?.url || currentProfile.photos[0]?.url || "/api/placeholder/400/600"}
                    alt={currentProfile.firstName}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  
                  {/* Photo indicators */}
                  {currentProfile.photos.length > 1 && (
                    <div className="absolute top-2 left-4 right-4 flex gap-1">
                      {currentProfile.photos.map((_, index) => (
                        <div
                          key={index}
                          className={`h-1 flex-1 rounded-full ${
                            index === photoIndex ? 'bg-white' : 'bg-white/40'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  
                  {/* Verified Badge */}
                  {currentProfile.verification.isVerified && (
                    <div className="absolute top-4 right-4 bg-blue-500 rounded-full p-1">
                      <Star className="h-4 w-4 text-white fill-current" />
                    </div>
                  )}
                  
                  {/* Profile Info Overlay */}
                  <div className="absolute bottom-4 left-4 right-4 text-white">
                    <h2 className="text-2xl font-bold mb-1">
                      {currentProfile.firstName}, {currentProfile.age}
                    </h2>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-1 text-sm opacity-90">
                        <MapPin className="h-4 w-4" />
                        <span>{currentProfile.location.city}</span>
                      </div>
                      {currentProfile.compatibilityScore && (
                        <span className="bg-pink-500/80 px-2 py-1 rounded-full text-xs font-medium">
                          {currentProfile.compatibilityScore}% Match
                        </span>
                      )}
                    </div>
                    <p className="text-sm opacity-90 line-clamp-2">
                      {currentProfile.bio}
                    </p>
                  </div>
                </div>

                {/* Profile Details */}
                <div className="p-4 h-1/4">
                  <div className="flex flex-wrap gap-2">
                    {currentProfile.interests.map((interest, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-xs font-medium"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-8">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePass}
            className="w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-gray-200 hover:border-red-300 transition-colors"
          >
            <X className="h-6 w-6 text-gray-400 hover:text-red-500 transition-colors" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSuperLike}
            className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-gray-200 hover:border-blue-300 transition-colors"
          >
            <Star className="h-5 w-5 text-gray-400 hover:text-blue-500 transition-colors" />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLike}
            className="w-16 h-16 bg-pink-500 rounded-full shadow-lg flex items-center justify-center hover:bg-pink-600 transition-colors"
          >
            <Heart className="h-8 w-8 text-white" />
          </motion.button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mt-8 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {statsLoading ? '...' : stats.likesToday}
            </div>
            <div className="text-sm text-gray-600">Likes Today</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {statsLoading ? '...' : stats.matches}
            </div>
            <div className="text-sm text-gray-600">Matches</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {statsLoading ? '...' : stats.messages}
            </div>
            <div className="text-sm text-gray-600">Messages</div>
          </div>
        </div>
      </main>

      {/* Match Modal */}
      {showMatchModal && matchedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center mx-4">
            <Star className="h-12 w-12 text-pink-500 mx-auto mb-4" />
            <h3 className="text-2xl font-semibold mb-2">It's a Match!</h3>
            <img
              src={matchedProfile.photos.find(p => p.isMain)?.url || matchedProfile.photos[0]?.url || "/api/placeholder/400/600"}
              alt={matchedProfile.firstName}
              className="w-24 h-24 rounded-full object-cover mx-auto mb-3 border-4 border-pink-100"
            />
            <p className="text-sm text-gray-600 mb-6">
              You and {matchedProfile.firstName} liked each other. Start a conversation now!
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowMatchModal(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium transition-colors"
              >
                Keep Swiping
              </button>
              <button
                onClick={() => {
                  setShowMatchModal(false);
                  router.push('/matches');
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium transition-colors"
              >
                Say Hi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex items-center justify-around max-w-md mx-auto">
          <button className="flex flex-col items-center space-y-1 text-pink-500">
            <Users className="h-6 w-6" />
            <span className="text-xs">Discover</span>
          </button>
          <button className="flex flex-col items-center space-y-1 text-gray-400">
            <Heart className="h-6 w-6" />
            <span className="text-xs">Likes</span>
          </button>
          <button className="flex flex-col items-center space-y-1 text-gray-400">
            <MessageCircle className="h-6 w-6" />
            <span className="text-xs">Messages</span>
          </button>
          <button className="flex flex-col items-center space-y-1 text-gray-400">
            <Camera className="h-6 w-6" />
            <span className="text-xs">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default withAuth(DashboardPage);