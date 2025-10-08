"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Button from "./ui/Button";
import { Card } from "./ui/Card";
import { useSubscription } from "../hooks/useSubscription";
import { apiRequest } from "../lib/api";
import { useToast } from "./ui/Toast";

interface IncognitoModeProps {
  className?: string;
}

const IncognitoMode: React.FC<IncognitoModeProps> = ({ className = "" }) => {
  const { canUseIncognitoMode } = useSubscription();
  const [isIncognito, setIsIncognito] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { showToast } = useToast();

  // Use the proper feature flag instead of subscription property
  const canUseIncognito = canUseIncognitoMode;

  useEffect(() => {
    fetchIncognitoStatus();
  }, []);

  const fetchIncognitoStatus = async () => {
    try {
      const data = await apiRequest("/user/incognito", {
        method: "GET",
      }) as { incognitoMode: boolean };
      setIsIncognito(data.incognitoMode);
    } catch (error) {
      console.error("Failed to fetch incognito status:", error);
    }
  };

  const toggleIncognito = async () => {
    if (!canUseIncognito) {
      setShowUpgrade(true);
      return;
    }

    setLoading(true);
    try {
      const data = await apiRequest("/user/incognito", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ enabled: !isIncognito }),
      }) as { incognitoMode: boolean };

      setIsIncognito(data.incognitoMode);
      showToast({
        type: "success", 
        title: data.incognitoMode ? "Incognito Mode On" : "Incognito Mode Off",
        message: data.incognitoMode 
          ? "You're now browsing privately" 
          : "You're now visible to others"
      });
    } catch (error: unknown) {
      console.error("Failed to toggle incognito mode:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      showToast({
        type: "error",
        title: "Failed to Toggle Incognito",
        message: errorMessage || "Unable to change incognito mode. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🕵️</span>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Incognito Mode
              </h3>
              {!canUseIncognito && (
                <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                  Premium Plus
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Browse profiles without appearing in their visitors list
            </p>
            {isIncognito && (
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                ✨ You&apos;re browsing incognito
              </p>
            )}
          </div>

          <div className="ml-4">
            <motion.button
              onClick={toggleIncognito}
              disabled={loading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isIncognito && canUseIncognito
                  ? "bg-purple-600"
                  : "bg-gray-200 dark:bg-gray-700"
              } ${loading ? "opacity-50" : ""}`}
              whileTap={{ scale: 0.95 }}
            >
              <motion.span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition ${
                  isIncognito && canUseIncognito
                    ? "translate-x-6"
                    : "translate-x-1"
                }`}
                layout
              />
            </motion.button>
          </div>
        </div>

        {!canUseIncognito && (
          <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="text-sm text-purple-700 dark:text-purple-300 mb-2">
              Upgrade to Premium Plus to browse anonymously
            </p>
            <Button
              onClick={() => setShowUpgrade(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-1"
            >
              Upgrade Now
            </Button>
          </div>
        )}
      </Card>

      {/* Upgrade Modal */}
      {showUpgrade && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowUpgrade(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="text-4xl mb-4">🕵️</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Incognito Mode
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Browse profiles without being seen. Your visits won&apos;t
                appear in their visitor history.
              </p>

              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                  Premium Plus Features
                </h3>
                <ul className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
                  <li>• Incognito browsing</li>
                  <li>• Unlimited likes & super likes</li>
                  <li>• Travel mode</li>
                  <li>• Message before matching</li>
                  <li>• Read receipts</li>
                  <li>• Ad-free experience</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowUpgrade(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Maybe Later
                </Button>
                <Button
                  onClick={() => {
                    // Navigate to subscription page
                    window.location.href = "/subscription";
                  }}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Upgrade
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export { IncognitoMode };
