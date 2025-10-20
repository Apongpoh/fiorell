"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { motion } from "framer-motion";
import {
  Crown,
  Check,
  Star,
  Loader2,
  CreditCard,
} from "lucide-react";
import { useNotification } from "@/contexts/NotificationContext";
import { useAuth } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";

interface Plan {
  id: string;
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
  monthlyEquivalentPrice?: number;
}

interface UserSubscription {
  type: string;
  expiresAt: string | null;
  features: string[];
}

export default function TraditionalSubscriptionPage() {
  return (
    <ErrorBoundary>
      <Suspense
        fallback={
          <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-pink-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading subscription plans...</p>
            </div>
          </div>
        }
      >
        <TraditionalSubscriptionContent />
      </Suspense>
    </ErrorBoundary>
  );
}

function TraditionalSubscriptionContent() {
  const { showNotification } = useNotification();
  const { user: currentUser } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  const getAuthToken = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem("fiorell_auth_token");
  }, []);

  const fetchPlans = useCallback(async () => {
    try {
      const response = await fetch("/api/subscription/plans");
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans);
      }
    } catch (error) {
      console.error("Error fetching plans:", error);
      showNotification("Failed to load subscription plans", "error");
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  const fetchUserSubscription = useCallback(async () => {
    if (!mounted) return;
    
    try {
      const token = getAuthToken();
      if (!token) return;

      const response = await fetch("/api/subscription", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUserSubscription(data.subscription);
      }
    } catch (error) {
      console.error("Error fetching subscription:", error);
    }
  }, [mounted, getAuthToken]);

  useEffect(() => {
    if (mounted) {
      fetchPlans();
      if (currentUser) {
        fetchUserSubscription();
      }
    }
  }, [currentUser, fetchPlans, mounted, fetchUserSubscription]);

  const handleUpgrade = async (planId: string) => {
    if (!mounted) return;
    
    if (!currentUser) {
      showNotification("Please sign in to upgrade to premium", "error");
      window.location.href = `/login?redirect=${encodeURIComponent("/subscription/traditional")}`;
      return;
    }

    try {
      setProcessingPlan(planId);
      const token = getAuthToken();

      const response = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();

      if (response.ok && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error(data.error || "Failed to create checkout session");
      }
    } catch (error) {
      console.error("Error upgrading subscription:", error);
      showNotification(
        error instanceof Error ? error.message : "Failed to upgrade subscription",
        "error"
      );
    } finally {
      setProcessingPlan(null);
    }
  };

  // Show loading state until mounted
  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-pink-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Traditional Payment
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              Pay with credit card, debit card, or PayPal
            </p>
          </motion.div>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className={`relative bg-white rounded-2xl shadow-lg border-2 ${
                plan.popular
                  ? "border-pink-500 ring-4 ring-pink-100"
                  : "border-gray-200"
              } overflow-hidden`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-center py-2 text-sm font-semibold">
                  <Star className="inline h-4 w-4 mr-1" />
                  Most Popular
                </div>
              )}

              <div className={`p-8 ${plan.popular ? "pt-16" : ""}`}>
                <div className="text-center mb-8">
                  <Crown className="h-12 w-12 text-pink-600 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                  
                  <div className="text-center">
                    <div className="text-4xl font-bold text-gray-900 mb-1">
                      ${plan.price}
                      <span className="text-lg font-normal text-gray-600">
                        /{plan.interval}
                      </span>
                    </div>
                    {plan.savings && (
                      <div className="text-sm text-green-600 font-medium">
                        Save ${plan.savings.savingsAmount} ({plan.savings.savingsPercentage}% off)
                      </div>
                    )}
                    {plan.monthlyEquivalentPrice && (
                      <div className="text-sm text-gray-500">
                        Equivalent to ${plan.monthlyEquivalentPrice}/month
                      </div>
                    )}
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={
                    processingPlan === plan.id ||
                    userSubscription?.type === plan.name.toLowerCase()
                  }
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${
                    userSubscription?.type === plan.name.toLowerCase()
                      ? "bg-gray-400 cursor-not-allowed"
                      : plan.popular
                      ? "bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 shadow-lg"
                      : "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800"
                  }`}
                >
                  {processingPlan === plan.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : userSubscription?.type === plan.name.toLowerCase() ? (
                    "Current Plan"
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      Upgrade to {plan.name}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}