"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Camera,
  Info,
} from "lucide-react";
import { useAuth, withAuth } from "@/contexts/AuthContext";
import {
  discoveryAPI,
  interactionsAPI,
  matchesAPI,
  userAPI,
  statsAPI,
} from "@/lib/api";
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
  defaultPhoto?: string;
}

// Static curated interest taxonomy (requested) – keep alphabetical-ish for UX discoverability
// NOTE: Adjust freely; UI will automatically paginate via the show more/less toggle.
const CURATED_INTERESTS: string[] = [
  "Photography",
  "Travel",
  "Cooking",
  "Yoga",
  "Music",
  "Technology",
  "Food",
  "Rock Climbing",
  "Art",
  "Design",
  "Dogs",
  "Wine Tasting",
  "Hiking",
  "Reading",
  "Movies",
  "Dancing",
  "Sports",
  "Gaming",
  "Fitness",
  "Nature",
  "Fashion",
  "Coffee",
  "Beach",
  "Adventure",
];

function DashboardPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfileIndex, setCurrentProfileIndex] = useState(0);
  const [dragDirection, setDragDirection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minAge: 18,
    maxAge: 60,
    gender: "all",
    verifiedOnly: false,
    interests: "" as string,
    maxDistance: 50,
  });
  const [isFiltering, setIsFiltering] = useState(false);
  const filterDebounceRef = useRef<number | null>(null);
  const [autoApply, setAutoApply] = useState(true); // enable debounce apply
  const [appliedFiltersSignature, setAppliedFiltersSignature] = useState("");
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Persist filters (A)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("fiorell_filters");
      if (stored) {
        const parsed = JSON.parse(stored);
        setFilters((prev) => ({ ...prev, ...parsed }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("fiorell_filters", JSON.stringify(filters));
    } catch {}
  }, [filters]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [photoProgress, setPhotoProgress] = useState(0); // 0-100 progress for current photo
  const [isPaused, setIsPaused] = useState(false); // long-press pause state
  const [liteMode, setLiteMode] = useState(false); // simplified visuals for performance
  // Swipe + gesture tuning constants
  const SWIPE_OFFSET_THRESHOLD = 80; // horizontal distance in px
  const SWIPE_VELOCITY_THRESHOLD = 650; // px/s horizontal velocity to count as swipe
  const SUPERLIKE_VERTICAL_THRESHOLD = 110; // vertical upward distance in px

  // Visual drag feedback state (point 1)
  const [dragFeedback, setDragFeedback] = useState<{
    direction: "left" | "right" | "up" | null;
    strength: number;
  }>({ direction: null, strength: 0 });
  const [pulseDirection, setPulseDirection] = useState<
    "left" | "right" | "up" | null
  >(null); // transient pulse when threshold crossed
  const lastDragFeedbackTsRef = useRef(0);
  const lastDragFeedbackRef = useRef<{
    direction: "left" | "right" | "up" | null;
    strength: number;
  }>({ direction: null, strength: 0 });

  // Gesture refs
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const gestureTriggeredRef = useRef(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [currentMatch, setCurrentMatch] = useState<Profile | null>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [stats, setStats] = useState({
    today: { likes: 0, views: 0 },
    totals: {
      receivedLikes: 0,
      receivedSuperLikes: 0,
      matches: 0,
      profileViews: 0,
    },
    active: { matches: 0, unreadMessages: 0 },
  });
  const [statsLoading, setStatsLoading] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);
  const { user, logout } = useAuth();
  const router = useRouter();
  const [swipeError, setSwipeError] = useState<string | null>(null);
  const swipeErrorTimeoutRef = useRef<number | null>(null);

  const safeSetSwipeError = (msg: string) => {
    setSwipeError(msg);
    if (swipeErrorTimeoutRef.current) {
      clearTimeout(swipeErrorTimeoutRef.current);
    }
    swipeErrorTimeoutRef.current = window.setTimeout(() => {
      setSwipeError(null);
    }, 2000);
  };

  // Load current user profile
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setUserLoading(true);
        const response = await userAPI.getProfile();
        setCurrentUser(response.user);
      } catch (error: any) {
        // If auth fails, redirect to login
        if (error.message.includes("Unauthorized")) {
          logout();
        } else {
          setError("Failed to load user profile");
        }
      } finally {
        setUserLoading(false);
      }
    };

    loadUserProfile();
  }, [logout]);

  // Load potential matches (with current filters)
  const fetchMatches = async () => {
    try {
      setLoading(true);
      const response = await discoveryAPI.getMatches({
        limit: 10,
        offset: 0,
        minAge: filters.minAge,
        maxAge: filters.maxAge,
        gender: filters.gender,
        verifiedOnly: filters.verifiedOnly,
        interests: filters.interests
          .split(",")
          .map((i) => i.trim())
          .filter(Boolean),
        maxDistance: filters.maxDistance,
      });
      setProfiles(response.matches || []);
      setCurrentProfileIndex(0);
      setPhotoIndex(0);
      setAppliedFiltersSignature(
        JSON.stringify({
          ...filters,
          interests: filters.interests
            .split(",")
            .map((i) => i.trim())
            .filter(Boolean)
            .sort(),
        })
      );
    } catch (error: any) {
      setError(error.message || "Failed to load matches");
    } finally {
      setLoading(false);
      setIsFiltering(false);
    }
  };

  useEffect(() => {
    fetchMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce apply on filter change (B)
  useEffect(() => {
    if (!autoApply) return; // manual mode
    if (loading) return; // avoid spamming while initial load
    if (filterDebounceRef.current)
      window.clearTimeout(filterDebounceRef.current);
    filterDebounceRef.current = window.setTimeout(() => {
      setIsFiltering(true);
      fetchMatches();
    }, 500); // 500ms debounce
    return () => {
      if (filterDebounceRef.current)
        window.clearTimeout(filterDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.minAge,
    filters.maxAge,
    filters.gender,
    filters.verifiedOnly,
    filters.interests,
    filters.maxDistance,
    autoApply,
  ]);
  // Static curated interests handling
  const [showAllInterests, setShowAllInterests] = useState(false);
  const VISIBLE_INTEREST_LIMIT = 12; // initial collapsed count
  const interestSuggestions = useMemo(() => {
    return showAllInterests
      ? CURATED_INTERESTS
      : CURATED_INTERESTS.slice(0, VISIBLE_INTEREST_LIMIT);
  }, [showAllInterests]);

  const toggleInterest = (i: string) => {
    const list = filters.interests
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    const exists = list.includes(i);
    const next = exists ? list.filter((x) => x !== i) : [...list, i];
    setFilters((f) => ({ ...f, interests: next.join(", ") }));
  };

  const filtersChanged = useMemo(() => {
    const sig = JSON.stringify({
      ...filters,
      interests: filters.interests
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean)
        .sort(),
    });
    return sig !== appliedFiltersSignature;
  }, [filters, appliedFiltersSignature]);

  // Save as preference (E)
  const saveAsPreference = async () => {
    if (!currentUser?.id) return;
    setSavingPrefs(true);
    try {
      await userAPI.updateProfile({
        preferences: {
          ageRange: { min: filters.minAge, max: filters.maxAge },
          maxDistance: filters.maxDistance,
          genderPreference:
            filters.gender === "all" ? undefined : filters.gender,
        } as any,
      });
      safeSetSwipeError("Preferences saved");
    } catch (e) {
      safeSetSwipeError("Failed to save");
    } finally {
      setSavingPrefs(false);
    }
  };

  // Fetch stats from backend
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoadingStats(true);
        if (!currentUser?.id) {
          return;
        }
        const data = await statsAPI.getUserStats(currentUser.id);
        setStats(data);
      } catch (error) {
        console.error("Error fetching stats:", error);
        setStats({
          today: { likes: 0, views: 0 },
          totals: {
            receivedLikes: 0,
            receivedSuperLikes: 0,
            matches: 0,
            profileViews: 0,
          },
          active: { matches: 0, unreadMessages: 0 },
        });
      } finally {
        setIsLoadingStats(false);
      }
    };

    if (currentUser?.id) {
      fetchStats();
    }
  }, [currentUser]);

  // Reset photo index when profile changes
  useEffect(() => {
    setPhotoIndex(0);
  }, [currentProfileIndex]);

  // Advanced story-style progress w/ pause + tap zones
  const PHOTO_DURATION = 4000; // ms per photo
  const startTimeRef = useRef<number | null>(null);
  const elapsedBeforePauseRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const longPressTimeoutRef = useRef<number | null>(null);
  const longPressActivatedRef = useRef(false);

  const currentProfile = profiles[currentProfileIndex];

  const nextPhoto = useCallback(() => {
    if (!currentProfile || currentProfile.photos.length <= 1) return;
    setPhotoIndex((prev) => (prev + 1) % currentProfile.photos.length);
  }, [currentProfile]);

  const prevPhoto = useCallback(() => {
    if (!currentProfile || currentProfile.photos.length <= 1) return;
    setPhotoIndex((prev) =>
      prev === 0 ? currentProfile!.photos.length - 1 : prev - 1
    );
  }, [currentProfile]);

  // (Re)start progress animation whenever the photo changes
  useEffect(() => {
    const profile = currentProfile;
    if (!profile || showMatchModal) return; // pause when modal open
    const total = profile.photos?.length || 0;
    if (total <= 1) {
      setPhotoProgress(0);
      return;
    }

    // reset trackers for new photo
    elapsedBeforePauseRef.current = 0;
    startTimeRef.current = performance.now();
    setPhotoProgress(0);
    setIsPaused(false);

    const animate = (ts: number) => {
      if (!startTimeRef.current) startTimeRef.current = ts;
      // If paused, just keep requesting next frame without advancing
      if (isPaused) {
        frameRef.current = requestAnimationFrame(animate);
        return;
      }
      const elapsed =
        elapsedBeforePauseRef.current + (ts - startTimeRef.current);
      const pct = Math.min(100, (elapsed / PHOTO_DURATION) * 100);
      // Throttle progress updates (reduce re-renders)
      setPhotoProgress((prev) =>
        pct < 99 && Math.abs(pct - prev) < 2.5 ? prev : pct
      );
      if (pct >= 100) {
        nextPhoto();
        return; // effect will restart for the next photo
      }
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [
    photoIndex,
    currentProfileIndex,
    profiles,
    showMatchModal,
    isPaused,
    nextPhoto,
  ]);

  const beginPause = () => {
    if (isPaused) return;
    // accumulate elapsed so far into the ref
    if (startTimeRef.current) {
      elapsedBeforePauseRef.current += performance.now() - startTimeRef.current;
    }
    setIsPaused(true);
  };

  const endPause = () => {
    if (!isPaused) return;
    startTimeRef.current = performance.now();
    setIsPaused(false);
  };

  const handlePointerDown = () => {
    longPressActivatedRef.current = false;
    if (longPressTimeoutRef.current)
      window.clearTimeout(longPressTimeoutRef.current);
    longPressTimeoutRef.current = window.setTimeout(() => {
      longPressActivatedRef.current = true;
      beginPause();
    }, 220); // long press threshold
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    // Always clear timer
    if (longPressTimeoutRef.current)
      window.clearTimeout(longPressTimeoutRef.current);

    if (longPressActivatedRef.current) {
      // was a long press -> resume
      longPressActivatedRef.current = false;
      endPause();
      return;
    }

    // Treat as a tap -> determine zone (left/back, right/forward)
    const bounds = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - bounds.left;
    if (bounds.width === 0) return;
    const leftZone = bounds.width * 0.35; // ~35% for previous
    if (x < leftZone) {
      prevPhoto();
    } else {
      nextPhoto();
    }
  };

  const handlePointerLeave = () => {
    // If user drags out while holding, cancel pending long-press
    if (longPressTimeoutRef.current)
      window.clearTimeout(longPressTimeoutRef.current);
    if (longPressActivatedRef.current) {
      longPressActivatedRef.current = false;
      endPause();
    }
  };
  // currentProfile constant already declared above
  useEffect(() => {
    try {
      const reduced =
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const mem = (navigator as any).deviceMemory;
      const lowMem = mem && mem <= 4;
      const lowCores =
        navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
      if (reduced || lowMem || lowCores) setLiteMode(true);
    } catch {}
  }, []);

  // Swipe queue to serialize backend calls & avoid race conditions
  const swipeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const lastSwipeTsRef = useRef(0);

  const moveToNextProfile = () => {
    if (profiles.length === 0) return;
    if (currentProfileIndex < profiles.length - 1) {
      setCurrentProfileIndex((prev) => prev + 1);
      setCurrentPhotoIndex(0);
    } else {
      setCurrentProfileIndex(0);
      setCurrentPhotoIndex(0);
    }
  };

  const handleSwipe = (direction: "left" | "right" | "up") => {
    const now = performance.now();
    if (now - lastSwipeTsRef.current < 120) return; // throttle accidental double triggers
    lastSwipeTsRef.current = now;

    if (profiles.length === 0 || !currentUser?.id) return;
    const profileSnapshot = profiles[currentProfileIndex];
    if (!profileSnapshot) return;

    const action =
      direction === "left"
        ? "pass"
        : direction === "up"
        ? "super_like"
        : "like";

    // Advance immediately for snappy UI
    moveToNextProfile();

    // Enqueue backend call (non-blocking)
    swipeQueueRef.current = swipeQueueRef.current
      .catch(() => {}) // swallow prior errors
      .then(async () => {
        try {
          const response = await interactionsAPI.recordSwipe(
            currentUser.id,
            profileSnapshot.id,
            action
          );
          if (response?.match) {
            // Show match modal on the profile just swiped
            setCurrentMatch(profileSnapshot);
            setShowMatchModal(true);
          }
          if (action === "like" || action === "super_like") {
            setStats((prev) => ({
              ...prev,
              today: { ...prev.today, likes: prev.today.likes + 1 },
            }));
          }
        } catch (err: any) {
          const msg = err?.message || String(err);
          if (/already performed/i.test(msg)) {
            // Duplicate – silently ignore (user already moved on)
            return;
          }
          // Network or server issue – optional: show small toast
          console.warn("Swipe API error (ignored, UI already advanced):", msg);
        }
      });
  };

  const loadMoreProfiles = async () => {
    try {
      const response = await discoveryAPI.getMatches({
        limit: 10,
        offset: profiles.length,
        minAge: filters.minAge,
        maxAge: filters.maxAge,
        gender: filters.gender,
        verifiedOnly: filters.verifiedOnly,
        interests: filters.interests
          .split(",")
          .map((i) => i.trim())
          .filter(Boolean),
        maxDistance: filters.maxDistance,
      });
      setProfiles((prev) => [...prev, ...(response.matches || [])]);
    } catch {
      throw new Error("Failed to load more profiles");
    }
  };

  const handleLike = () => handleSwipe("right");
  const handleSuperLike = () => handleSwipe("up");
  const handlePass = () => handleSwipe("left");

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
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            No more profiles
          </h2>
          <p className="text-gray-600 mb-4">
            Check back later for new matches!
          </p>
          <button
            onClick={() => router.push("/matches")}
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
      {swipeError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 text-white text-xs px-3 py-2 rounded-full shadow-lg animate-fade-in">
          {swipeError}
        </div>
      )}
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-2">
            <Heart className="h-8 w-8 text-pink-500" />
            <span className="text-2xl font-bold text-gray-900">Fiorell</span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className="p-2 text-gray-600 hover:text-pink-600 transition-colors relative"
            >
              <Filter className="h-6 w-6" />
              {(filters.gender !== "all" || filters.verifiedOnly) && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-pink-500 animate-pulse" />
              )}
            </button>
            <button
              onClick={() => router.push("/matches")}
              className="p-2 text-gray-600 hover:text-pink-600 transition-colors"
            >
              <MessageCircle className="h-6 w-6" />
            </button>
            <button
              onClick={() => router.push("/profile")}
              className="w-8 h-8 bg-pink-500 cursor-pointer rounded-full flex items-center justify-center hover:bg-pink-600 transition-colors"
              title="Profile"
            >
              <span className="text-white font-semibold text-sm">
                {(currentUser?.firstName || user?.firstName)
                  ?.charAt(0)
                  ?.toUpperCase() || "U"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6">
        {showFilters && (
          <div className="mb-4 p-4 bg-white rounded-2xl shadow border border-gray-100 space-y-4 relative">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <label className="space-y-1">
                <span className="font-medium text-gray-600">Min Age</span>
                <input
                  type="number"
                  min={18}
                  max={filters.maxAge}
                  value={filters.minAge}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      minAge: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
                />
              </label>
              <label className="space-y-1 col-span-2">
                <span className="font-medium text-gray-600 flex items-center justify-between">
                  Interests
                  <button
                    type="button"
                    onClick={() => setFilters((f) => ({ ...f, interests: "" }))}
                    className="text-[10px] text-gray-400 hover:text-gray-600 underline"
                  >
                    Clear
                  </button>
                </span>
                <div className="flex flex-wrap gap-1">
                  {interestSuggestions.map((i) => {
                    const active = filters.interests
                      .toLowerCase()
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean)
                      .includes(i.toLowerCase());
                    return (
                      <button
                        type="button"
                        key={i}
                        onClick={() => toggleInterest(i)}
                        className={`px-2 py-1 rounded-full border text-[10px] ${
                          active
                            ? "bg-pink-500 text-white border-pink-500"
                            : "border-gray-300 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {i}
                      </button>
                    );
                  })}
                  {!interestSuggestions.length && (
                    <span className="text-[10px] text-gray-400">
                      No suggestions
                    </span>
                  )}
                  {CURATED_INTERESTS.length > VISIBLE_INTEREST_LIMIT && (
                    <button
                      type="button"
                      onClick={() => setShowAllInterests((v) => !v)}
                      className="px-2 py-1 rounded-full border text-[10px] border-dashed border-pink-400 text-pink-600 hover:bg-pink-50"
                    >
                      {showAllInterests
                        ? "Show less"
                        : `Show ${
                            CURATED_INTERESTS.length - VISIBLE_INTEREST_LIMIT
                          } more`}
                    </button>
                  )}
                </div>
              </label>
              <label className="space-y-1">
                <span className="font-medium text-gray-600">Max Age</span>
                <input
                  type="number"
                  min={filters.minAge}
                  max={99}
                  value={filters.maxAge}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      maxAge: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
                />
              </label>
              <label className="space-y-1 col-span-2">
                <span className="font-medium text-gray-600">Gender</span>
                <select
                  value={filters.gender}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, gender: e.target.value }))
                  }
                  className="w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
                >
                  <option value="all">All</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="prefer-not-to-say">Prefer not</option>
                </select>
              </label>
              <label className="flex items-center gap-2 col-span-2 text-gray-600">
                <input
                  type="checkbox"
                  checked={filters.verifiedOnly}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      verifiedOnly: e.target.checked,
                    }))
                  }
                  className="text-pink-500 rounded border-gray-300 focus:ring-pink-500"
                />
                <span className="text-xs">Verified only</span>
              </label>
              <label className="space-y-1 col-span-2">
                <span className="font-medium text-gray-600">
                  Interests (comma separated)
                </span>
                <input
                  type="text"
                  value={filters.interests}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, interests: e.target.value }))
                  }
                  placeholder="music, travel"
                  className="w-full rounded-md border-gray-300 focus:ring-pink-500 focus:border-pink-500"
                />
              </label>
              <label className="space-y-1 col-span-2">
                <span className="font-medium text-gray-600 flex justify-between">
                  <span>Max Distance (km)</span>
                  <span className="font-normal text-gray-500">
                    {filters.maxDistance}
                  </span>
                </span>
                <input
                  type="range"
                  min={1}
                  max={200}
                  value={filters.maxDistance}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      maxDistance: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-pink-500"
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2 pt-1 items-center">
              <label className="flex items-center gap-1 text-[11px] text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoApply}
                  onChange={(e) => setAutoApply(e.target.checked)}
                  className="rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                />
                Auto Apply
              </label>
              <button
                disabled={isFiltering || autoApply || !filtersChanged}
                onClick={() => {
                  setIsFiltering(true);
                  fetchMatches();
                }}
                className="px-3 py-2 text-xs font-medium rounded-md bg-pink-500 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-pink-600"
              >
                {isFiltering ? "Applying..." : "Apply"}
              </button>
              <button
                type="button"
                disabled={isFiltering}
                onClick={() => {
                  setFilters({
                    minAge: 18,
                    maxAge: 60,
                    gender: "all",
                    verifiedOnly: false,
                    interests: "",
                    maxDistance: 50,
                  });
                  if (!autoApply) {
                    setIsFiltering(true);
                    fetchMatches();
                  }
                }}
                className="px-3 py-2 text-xs font-medium rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
              >
                Reset
              </button>
              <button
                type="button"
                disabled={savingPrefs || filters.gender === "all"}
                onClick={saveAsPreference}
                className="px-3 py-2 text-xs font-medium rounded-md bg-emerald-500 text-white disabled:opacity-40 hover:bg-emerald-600"
              >
                {savingPrefs ? "Saving..." : "Save Prefs"}
              </button>
            </div>
          </div>
        )}
        {/* Match count / No results (C) */}
        {!loading && profiles.length > 0 && (
          <div className="mb-3 text-[11px] text-gray-500 flex justify-between">
            <span>
              {profiles.length} result{profiles.length !== 1 && "s"}
              {filtersChanged && " (unapplied view)"}
            </span>
            {autoApply ? (
              <span>Auto apply</span>
            ) : filtersChanged ? (
              <span className="text-amber-600">Changes pending</span>
            ) : (
              <span className="text-emerald-600">Up to date</span>
            )}
          </div>
        )}
        {!loading && profiles.length === 0 && (
          <div className="mb-4 p-6 bg-white rounded-xl border text-center">
            <p className="text-sm font-medium text-gray-700 mb-1">No results</p>
            <p className="text-xs text-gray-500 mb-3">
              Try broadening your filters or resetting them.
            </p>
            <button
              onClick={() =>
                setFilters({
                  minAge: 18,
                  maxAge: 60,
                  gender: "all",
                  verifiedOnly: false,
                  interests: "",
                  maxDistance: 50,
                })
              }
              className="px-3 py-1.5 text-xs rounded-md bg-pink-500 text-white hover:bg-pink-600"
            >
              Reset Filters
            </button>
          </div>
        )}
        <div className="relative h-[600px] mb-6">
          <AnimatePresence mode="wait">
            {currentProfile && (
              <motion.div
                key={currentProfile.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: 1,
                  x:
                    dragDirection === "left"
                      ? -300
                      : dragDirection === "right"
                      ? 300
                      : 0,
                  rotate:
                    dragDirection === "left"
                      ? -30
                      : dragDirection === "right"
                      ? 30
                      : 0,
                }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-white rounded-2xl shadow-xl overflow-hidden"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.6}
                style={{ touchAction: "none" }}
                onPointerDown={(e) => {
                  pointerStartRef.current = { x: e.clientX, y: e.clientY };
                  gestureTriggeredRef.current = false;
                  setDragFeedback({ direction: null, strength: 0 });
                }}
                onPointerUp={(e) => {
                  if (gestureTriggeredRef.current) return;
                  if (!pointerStartRef.current) return;
                  if (isPaused) return; // prevent interactions while paused
                  if (!currentProfile) return;
                  const dx = e.clientX - pointerStartRef.current.x;
                  const dy = e.clientY - pointerStartRef.current.y;
                  // Upward swipe detection for super like
                  if (
                    dy < -SUPERLIKE_VERTICAL_THRESHOLD &&
                    Math.abs(dx) < SWIPE_OFFSET_THRESHOLD * 0.75
                  ) {
                    gestureTriggeredRef.current = true;
                    setDragDirection("up");
                    setTimeout(() => {
                      handleSwipe("up");
                      setDragDirection(null);
                    }, 120);
                  }
                }}
                onDragEnd={(event, info) => {
                  if (isPaused) return; // do not swipe while paused
                  if (gestureTriggeredRef.current) return; // already handled as vertical gesture
                  const offsetX = info.offset.x;
                  const velocityX = info.velocity.x || 0;
                  // Reset feedback when drag completes
                  setTimeout(
                    () => setDragFeedback({ direction: null, strength: 0 }),
                    120
                  );
                  if (
                    offsetX > SWIPE_OFFSET_THRESHOLD ||
                    velocityX > SWIPE_VELOCITY_THRESHOLD
                  ) {
                    // Swipe Right -> Like
                    gestureTriggeredRef.current = true;
                    setDragDirection("right");
                    setTimeout(() => {
                      handleSwipe("right");
                      setDragDirection(null);
                    }, 140);
                  } else if (
                    offsetX < -SWIPE_OFFSET_THRESHOLD ||
                    velocityX < -SWIPE_VELOCITY_THRESHOLD
                  ) {
                    // Swipe Left -> Pass
                    gestureTriggeredRef.current = true;
                    setDragDirection("left");
                    setTimeout(() => {
                      handleSwipe("left");
                      setDragDirection(null);
                    }, 140);
                  } else {
                    setDragDirection(null);
                  }
                }}
                onDrag={(e, info) => {
                  if (isPaused) return;
                  if (gestureTriggeredRef.current) return;
                  if (!currentProfile) return;
                  const { offset } = info;
                  const { x, y } = offset;
                  const absX = Math.abs(x);
                  const absY = Math.abs(y);
                  const now = performance.now();
                  const update = (
                    direction: "left" | "right" | "up" | null,
                    strength: number
                  ) => {
                    if (
                      direction === lastDragFeedbackRef.current.direction &&
                      Math.abs(
                        strength - lastDragFeedbackRef.current.strength
                      ) < 0.1 &&
                      now - lastDragFeedbackTsRef.current < 60
                    )
                      return;
                    lastDragFeedbackRef.current = { direction, strength };
                    lastDragFeedbackTsRef.current = now;
                    setDragFeedback({ direction, strength });
                  };
                  if (absY > absX && y < -10) {
                    const strength = Math.min(
                      1,
                      Math.abs(y) / SUPERLIKE_VERTICAL_THRESHOLD
                    );
                    if (
                      strength >= 1 &&
                      dragFeedback.direction !== "up" &&
                      !liteMode
                    ) {
                      setPulseDirection("up");
                      setTimeout(() => setPulseDirection(null), 200);
                    }
                    update("up", strength);
                  } else if (absX > 6) {
                    const strength = Math.min(1, absX / SWIPE_OFFSET_THRESHOLD);
                    if (x > 0) {
                      if (
                        strength >= 1 &&
                        dragFeedback.direction !== "right" &&
                        !liteMode
                      ) {
                        setPulseDirection("right");
                        setTimeout(() => setPulseDirection(null), 200);
                      }
                      update("right", strength);
                    } else {
                      if (
                        strength >= 1 &&
                        dragFeedback.direction !== "left" &&
                        !liteMode
                      ) {
                        setPulseDirection("left");
                        setTimeout(() => setPulseDirection(null), 200);
                      }
                      update("left", strength);
                    }
                  } else if (lastDragFeedbackRef.current.direction !== null) {
                    update(null, 0);
                  }
                }}
              >
                {/* Drag feedback overlay (directional tint) */}
                {dragFeedback.direction && (
                  <div
                    className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden"
                    style={{
                      background:
                        dragFeedback.direction === "right"
                          ? "linear-gradient(to right, rgba(16,185,129,0.25), rgba(5,150,105,0.15))"
                          : dragFeedback.direction === "left"
                          ? "linear-gradient(to left, rgba(244,63,94,0.28), rgba(225,29,72,0.15))"
                          : "linear-gradient(to top, rgba(59,130,246,0.3), rgba(37,99,235,0.15))",
                      opacity: 0.15 + dragFeedback.strength * 0.55,
                      mixBlendMode: "overlay",
                      transition: "opacity 120ms ease",
                    }}
                  />
                )}
                {/* Direction Icon / Label */}
                {dragFeedback.direction && (
                  <div className="absolute top-5 left-1/2 -translate-x-1/2 z-10 pointer-events-none flex flex-col items-center gap-1 select-none">
                    <div
                      className={`rounded-full backdrop-blur-sm px-4 py-2 flex items-center gap-2 border text-xs font-semibold tracking-wide uppercase shadow-md ${
                        dragFeedback.direction === "right"
                          ? "border-emerald-300/70 bg-emerald-500/20 text-emerald-100"
                          : dragFeedback.direction === "left"
                          ? "border-rose-300/70 bg-rose-500/25 text-rose-100"
                          : "border-sky-300/70 bg-sky-500/25 text-sky-100"
                      }`}
                      style={{
                        transform: `scale(${
                          0.9 + dragFeedback.strength * 0.25
                        })`,
                        opacity: 0.6 + dragFeedback.strength * 0.4,
                        transition: "transform 120ms ease, opacity 120ms ease",
                      }}
                    >
                      {dragFeedback.direction === "left" && (
                        <X className="h-4 w-4" />
                      )}
                      {dragFeedback.direction === "right" && (
                        <Heart className="h-4 w-4" />
                      )}
                      {dragFeedback.direction === "up" && (
                        <Star className="h-4 w-4" />
                      )}
                      <span>
                        {dragFeedback.direction === "left"
                          ? "Pass"
                          : dragFeedback.direction === "right"
                          ? "Like"
                          : "Super Like"}
                      </span>
                    </div>
                    {/* Pulse ring */}
                    {!liteMode &&
                      pulseDirection &&
                      pulseDirection === dragFeedback.direction && (
                        <div className="relative">
                          <div className="absolute inset-0 -z-10 animate-ping-slow rounded-full bg-white/60" />
                        </div>
                      )}
                  </div>
                )}
                {/* Profile Image */}
                <div
                  className="relative h-3/4 cursor-pointer select-none"
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerLeave}
                >
                  <img
                    src={
                      currentProfile.photos?.[photoIndex]?.url ||
                      currentProfile.photos?.[0]?.url ||
                      currentProfile.defaultPhoto ||
                      "/api/placeholder/profile"
                    }
                    alt={currentProfile.firstName}
                    className="w-full h-full object-cover"
                    draggable={false}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/api/placeholder/profile";
                    }}
                  />

                  {/* Story-style progress bars */}
                  {currentProfile.photos &&
                    currentProfile.photos.length > 1 && (
                      <div className="absolute top-2 left-4 right-4 flex gap-1">
                        {currentProfile.photos.map((_, idx) => {
                          const filled =
                            idx < photoIndex
                              ? 100
                              : idx === photoIndex
                              ? photoProgress
                              : 0;
                          return (
                            <div
                              key={idx}
                              className="h-1 flex-1 rounded-full bg-white/25 overflow-hidden relative"
                            >
                              <div
                                className={`h-full ${
                                  liteMode
                                    ? "bg-white"
                                    : "bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500"
                                } transition-[width] duration-150 ${
                                  idx === photoIndex && !liteMode
                                    ? "shadow-[0_0_4px_rgba(255,255,255,0.8)]"
                                    : ""
                                }`}
                                style={{ width: `${filled}%` }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}

                  {/* Pause indicator */}
                  {isPaused && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-xs font-medium px-2 py-1 bg-black/50 rounded-full tracking-wide">
                      Paused
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                  {/* Top Right Overlay Buttons */}
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    {currentProfile.verification.isVerified && (
                      <div className="bg-blue-500 rounded-full p-1">
                        <Star className="h-4 w-4 text-white fill-current" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/profile/${currentProfile.id}`);
                      }}
                      className="bg-white/70 backdrop-blur-sm hover:bg-white text-gray-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 shadow-sm transition-colors"
                    >
                      <Info className="h-3 w-3" /> Profile
                    </button>
                  </div>

                  {/* Profile Info Overlay */}
                  <div className="absolute bottom-4 left-4 right-4 text-white pointer-events-none">
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
              {isLoadingStats ? "..." : stats.today.likes}
            </div>
            <div className="text-sm text-gray-600">Likes Today</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {isLoadingStats ? "..." : stats.active.matches}
            </div>
            <div className="text-sm text-gray-600">Active Matches</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {isLoadingStats ? "..." : stats.active.unreadMessages}
            </div>
            <div className="text-sm text-gray-600">Unread Messages</div>
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
              src={
                matchedProfile.photos.find((p) => p.isMain)?.url ||
                matchedProfile.photos[0]?.url ||
                matchedProfile.defaultPhoto ||
                "/api/placeholder/profile"
              }
              alt={matchedProfile.firstName}
              className="w-24 h-24 rounded-full object-cover mx-auto mb-3 border-4 border-pink-100"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/api/placeholder/profile";
              }}
            />
            <p className="text-sm text-gray-600 mb-6">
              You and {matchedProfile.firstName} liked each other. Start a
              conversation now!
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
                  router.push("/matches");
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
          <button
            onClick={() => router.push("/dashboard")}
            className="flex flex-col items-center space-y-1 text-pink-500"
          >
            <Users className="h-6 w-6" />
            <span className="text-xs">Discover</span>
          </button>
          <button
            onClick={() => router.push("/matches")}
            className="flex flex-col items-center space-y-1 text-gray-400 hover:text-pink-500 transition-colors"
          >
            <Heart className="h-6 w-6" />
            <span className="text-xs">Likes</span>
          </button>
          <button
            onClick={() => router.push("/chat")}
            className="flex flex-col items-center space-y-1 text-gray-400 hover:text-pink-500 transition-colors"
          >
            <MessageCircle className="h-6 w-6" />
            <span className="text-xs">Messages</span>
          </button>
          <button
            onClick={() => router.push("/profile")}
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

export default withAuth(DashboardPage);

// NOTE: The styled-jsx global animation previously inlined here was removed.
// If needed across the app, add the keyframes & utility class to globals.css or Tailwind config:
// @layer utilities { @keyframes ping-slow-custom { 0%{transform:scale(.9);opacity:.65}70%{transform:scale(1.4);opacity:0}100%{transform:scale(1.5);opacity:0} } .animate-ping-slow{animation:ping-slow-custom .9s ease-out forwards} }
