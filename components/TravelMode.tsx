"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Button from "./ui/Button";
import { Card } from "./ui/Card";
import { useSubscription } from "../hooks/useSubscription";
import { apiRequest } from "../lib/api";

interface TravelModeProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TravelStatus {
  isActive: boolean;
  currentLocation?: {
    city: string;
    country: string;
    coordinates: [number, number];
  };
  originalLocation?: {
    city: string;
    country: string;
    coordinates: [number, number];
  };
}

const TravelMode: React.FC<TravelModeProps> = ({ isOpen, onClose }) => {
  const { subscription } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [travelStatus, setTravelStatus] = useState<TravelStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [searching, setSearching] = useState(false);

  const canUseTravel = subscription?.hasPremiumPlus;

  interface LocationResult {
    name: string;
    coordinates: [number, number];
  }

  useEffect(() => {
    if (isOpen) {
      fetchTravelStatus();
    }
  }, [isOpen]);

  const fetchTravelStatus = async () => {
    try {
      const response = (await apiRequest("/user/travel", {
        method: "GET",
      })) as Response;
      if (response.ok) {
        const data = await response.json();
        setTravelStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch travel status:", error);
    }
  };

  const searchLocations = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      // For demo purposes, using mock data
      // In production, you'd use a geocoding service like Google Places API
      const mockResults: LocationResult[] = [
        {
          name: "New York, NY, USA",
          coordinates: [-74.006, 40.7128] as [number, number],
        },
        {
          name: "London, UK",
          coordinates: [-0.1276, 51.5074] as [number, number],
        },
        {
          name: "Paris, France",
          coordinates: [2.3522, 48.8566] as [number, number],
        },
        {
          name: "Tokyo, Japan",
          coordinates: [139.6503, 35.6762] as [number, number],
        },
        {
          name: "Sydney, Australia",
          coordinates: [151.2093, -33.8688] as [number, number],
        },
      ].filter((location) =>
        location.name.toLowerCase().includes(query.toLowerCase())
      );

      setSearchResults(mockResults);
    } catch (error) {
      console.error("Failed to search locations:", error);
    } finally {
      setSearching(false);
    }
  };

  const activateTravelMode = async (location: LocationResult) => {
    setLoading(true);
    try {
      const response = (await apiRequest("/user/travel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "activate",
          location: {
            city: location.name.split(",")[0],
            country: location.name.split(", ").slice(-1)[0],
            coordinates: location.coordinates,
          },
        }),
      })) as Response;

      if (response.ok) {
        await fetchTravelStatus();
        setSearchQuery("");
        setSearchResults([]);
      } else {
        const error = await response.json();
        alert(error.message || "Failed to activate travel mode");
      }
    } catch (error) {
      console.error("Failed to activate travel mode:", error);
      alert("Failed to activate travel mode");
    } finally {
      setLoading(false);
    }
  };

  const deactivateTravelMode = async () => {
    setLoading(true);
    try {
      const response = (await apiRequest("/user/travel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "deactivate" }),
      })) as Response;

      if (response.ok) {
        await fetchTravelStatus();
      } else {
        const error = await response.json();
        alert(error.message || "Failed to deactivate travel mode");
      }
    } catch (error) {
      console.error("Failed to deactivate travel mode:", error);
      alert("Failed to deactivate travel mode");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
            >
              <span className="text-gray-600 dark:text-gray-300 text-lg">
                ×
              </span>
            </button>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                ✈️ Travel Mode
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Discover people in any city around the world
              </p>
            </div>

            {!canUseTravel && (
              <Card className="mb-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <div className="text-center p-4">
                  <h3 className="font-semibold mb-2">
                    🔒 Premium Plus Required
                  </h3>
                  <p className="text-sm opacity-90 mb-3">
                    Upgrade to Premium Plus to travel anywhere in the world
                  </p>
                  <Button
                    onClick={() => (window.location.href = "/subscription")}
                    className="bg-white text-purple-600 hover:bg-gray-100"
                  >
                    Upgrade Now
                  </Button>
                </div>
              </Card>
            )}

            {canUseTravel && (
              <>
                {travelStatus?.isActive && (
                  <Card className="mb-6 bg-gradient-to-r from-green-500 to-blue-500 text-white">
                    <div className="p-4">
                      <h3 className="font-semibold mb-1">
                        🌍 Currently Traveling
                      </h3>
                      <p className="text-sm opacity-90">
                        {travelStatus.currentLocation?.city},{" "}
                        {travelStatus.currentLocation?.country}
                      </p>
                      {travelStatus.originalLocation && (
                        <p className="text-xs opacity-75 mt-1">
                          Original: {travelStatus.originalLocation.city},{" "}
                          {travelStatus.originalLocation.country}
                        </p>
                      )}
                      <Button
                        onClick={deactivateTravelMode}
                        disabled={loading}
                        className="mt-3 bg-white text-green-600 hover:bg-gray-100 text-sm"
                      >
                        {loading ? "Returning..." : "Return Home"}
                      </Button>
                    </div>
                  </Card>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Search for a destination
                    </label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        searchLocations(e.target.value);
                      }}
                      placeholder="Enter city name..."
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      disabled={!canUseTravel}
                    />
                  </div>

                  {searching && (
                    <div className="text-center py-4 text-gray-500">
                      Searching locations...
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {searchResults.map((location, index) => (
                        <Card
                          key={index}
                          className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                          onClick={() => activateTravelMode(location)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {location.name}
                              </p>
                            </div>
                            <div className="text-purple-600 dark:text-purple-400">
                              ✈️
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}

                  {searchQuery.length >= 3 &&
                    searchResults.length === 0 &&
                    !searching && (
                      <div className="text-center py-4 text-gray-500">
                        No locations found. Try a different search term.
                      </div>
                    )}
                </div>
              </>
            )}

            <div className="mt-6 text-center">
              <Button onClick={onClose} variant="outline" className="px-8">
                Close
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export { TravelMode };
