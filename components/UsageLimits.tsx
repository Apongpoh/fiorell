"use client";

import React from "react";
import { motion } from "framer-motion";
import { Heart, Zap, Rocket, Crown } from "lucide-react";
import { useDailyLimits } from "@/hooks/useSubscription";
import Link from "next/link";

interface UsageLimitBarProps {
  icon: React.ReactNode;
  label: string;
  current: number;
  limit: number;
  color: string;
  upgradePrompt?: string;
}

function UsageLimitBar({
  icon,
  label,
  current,
  limit,
  color,
  upgradePrompt,
}: UsageLimitBarProps) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 100 : Math.min(100, (current / limit) * 100);
  const remaining = isUnlimited ? "Unlimited" : Math.max(0, limit - current);

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
          <div>
            <h4 className="font-medium text-gray-900">{label}</h4>
            <p className="text-sm text-gray-500">
              {isUnlimited ? "Unlimited" : `${remaining} remaining today`}
            </p>
          </div>
        </div>

        {!isUnlimited && upgradePrompt && current >= limit && (
          <Link href="/subscription">
            <button className="text-xs bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-3 py-1 rounded-full hover:from-blue-600 hover:to-indigo-600 transition-colors">
              Upgrade
            </button>
          </Link>
        )}
      </div>

      {!isUnlimited && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              {current} / {limit} used
            </span>
            <span
              className={`font-medium ${
                percentage >= 80
                  ? "text-red-500"
                  : percentage >= 60
                  ? "text-yellow-500"
                  : "text-green-500"
              }`}
            >
              {percentage.toFixed(0)}%
            </span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className={`h-2 rounded-full ${
                percentage >= 80
                  ? "bg-red-400"
                  : percentage >= 60
                  ? "bg-yellow-400"
                  : "bg-green-400"
              }`}
            />
          </div>
        </div>
      )}

      {isUnlimited && (
        <div className="flex items-center gap-2 text-sm text-indigo-600">
          <Crown className="h-4 w-4" />
          <span className="font-medium">Premium Feature</span>
        </div>
      )}
    </div>
  );
}

export function UsageLimitsCard() {
  const { likes, superLikes, boosts } = useDailyLimits();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Daily Usage</h3>
        <Link href="/subscription">
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            Upgrade for unlimited
          </button>
        </Link>
      </div>

      <div className="space-y-3">
        <UsageLimitBar
          icon={<Heart className="h-4 w-4 text-white" />}
          label="Likes"
          current={likes.current}
          limit={likes.limit}
          color="bg-red-500"
          upgradePrompt="Get unlimited likes with Premium"
        />

        <UsageLimitBar
          icon={<Zap className="h-4 w-4 text-white" />}
          label="Super Likes"
          current={superLikes.current}
          limit={superLikes.limit}
          color="bg-blue-500"
          upgradePrompt="Get more super likes with Premium"
        />

        <UsageLimitBar
          icon={<Rocket className="h-4 w-4 text-white" />}
          label="Boosts"
          current={boosts.current}
          limit={boosts.limit}
          color="bg-purple-500"
          upgradePrompt="Get daily boosts with Premium"
        />
      </div>

      {(likes.current >= likes.limit ||
        superLikes.current >= superLikes.limit) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            <div className="bg-blue-500 rounded-full p-2">
              <Crown className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 mb-1">
                You&apos;ve reached your daily limit!
              </h4>
              <p className="text-sm text-blue-700 mb-3">
                Upgrade to Premium for unlimited likes and more features, or
                wait until tomorrow for your limits to reset.
              </p>
              <Link href="/subscription">
                <button className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">
                  Upgrade Now
                </button>
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Mini usage indicator for the main UI
export function MiniUsageIndicator({
  type,
}: {
  type: "likes" | "superLikes" | "boosts";
}) {
  const { likes, superLikes, boosts } = useDailyLimits();

  const data =
    type === "likes" ? likes : type === "superLikes" ? superLikes : boosts;

  if (data.limit === -1) {
    return (
      <div className="flex items-center gap-1 text-xs text-indigo-600">
        <Crown className="h-3 w-3" />
        <span>Unlimited</span>
      </div>
    );
  }

  const percentage = (data.current / data.limit) * 100;

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex-1 bg-gray-200 rounded-full h-1">
        <div
          className={`h-1 rounded-full transition-all ${
            percentage >= 80
              ? "bg-red-400"
              : percentage >= 60
              ? "bg-yellow-400"
              : "bg-green-400"
          }`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
      <span className="text-gray-600 min-w-max">{data.remaining} left</span>
    </div>
  );
}
