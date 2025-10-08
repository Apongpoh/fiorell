// components/SubscriptionCard.tsx
"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Crown, Check, Star, Calendar, CreditCard } from "lucide-react";
import Button from "./ui/Button";
import { Card } from "./ui/Card";
import { useSubscription } from "@/hooks/useSubscription";
import { apiRequest } from "@/lib/api";
import { useNotification } from "@/contexts/NotificationContext";

interface SubscriptionCardProps {
  planId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: "month" | "year";
  features: string[];
  popular?: boolean;
  savings?: {
    savingsAmount: number;
    savingsPercentage: number;
  };
  className?: string;
  onUpgrade?: () => void;
}

export default function SubscriptionCard({
  planId,
  name,
  description,
  price,
  currency,
  interval,
  features,
  popular = false,
  savings,
  className = "",
  onUpgrade
}: SubscriptionCardProps) {
  const [loading, setLoading] = useState(false);
  const { subscription, loading: subscriptionLoading } = useSubscription();
  const { showNotification } = useNotification();

  const isCurrentPlan = subscription?.planId === planId;
  const canUpgrade = !isCurrentPlan && !subscriptionLoading;

  const handleUpgrade = async () => {
    if (!canUpgrade || loading) return;

    setLoading(true);
    try {
      const response = (await apiRequest("/subscription/upgrade", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId,
          successUrl: `${window.location.origin}/subscription/success`,
          cancelUrl: `${window.location.origin}/subscription`,
        }),
      })) as Response;

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create checkout session");
      }

      const data = await response.json();
      
      // Redirect to checkout
      window.location.href = data.checkoutUrl;
      
      if (onUpgrade) {
        onUpgrade();
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      showNotification(
        error instanceof Error ? error.message : "Failed to start upgrade process",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative ${className}`}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center">
            <Star className="w-4 h-4 mr-1" />
            Most Popular
          </div>
        </div>
      )}

      <Card
        className={`h-full p-6 transition-all duration-300 ${
          popular
            ? "border-2 border-purple-500 shadow-2xl"
            : "border border-gray-200 hover:shadow-lg"
        } ${isCurrentPlan ? "bg-green-50 border-green-500" : ""}`}
      >
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-3">
            <Crown
              className={`w-8 h-8 ${
                popular ? "text-purple-500" : "text-gray-400"
              }`}
            />
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{name}</h3>
          <p className="text-gray-600 text-sm mb-4">{description}</p>

          <div className="mb-4">
            <div className="flex items-baseline justify-center">
              <span className="text-4xl font-bold text-gray-900">
                {formatPrice(price)}
              </span>
              <span className="text-gray-500 ml-1">/{interval}</span>
            </div>
            
            {savings && (
              <div className="mt-2">
                <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  Save {savings.savingsPercentage}% ({formatPrice(savings.savingsAmount)}/year)
                </span>
              </div>
            )}
          </div>
        </div>

        <ul className="space-y-3 mb-8">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
              <span className="text-gray-700 text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto">
          {isCurrentPlan ? (
            <div className="flex items-center justify-center py-3 bg-green-100 rounded-lg">
              <Check className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-green-600 font-semibold">Current Plan</span>
            </div>
          ) : (
            <Button
              onClick={handleUpgrade}
              disabled={loading || subscriptionLoading}
              className={`w-full ${
                popular
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  : "bg-gray-900 hover:bg-gray-800"
              }`}
            >
              {loading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                  />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Upgrade Now
                </>
              )}
            </Button>
          )}
        </div>

        {subscription && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Current: {subscription.planName || subscription.type}</span>
              {subscription.daysRemaining && (
                <span className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {subscription.daysRemaining} days left
                </span>
              )}
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}