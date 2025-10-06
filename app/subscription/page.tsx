"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Crown,
  Check,
  Star,
  Zap,
  Heart,
  Eye,
  MessageCircle,
  Shield,
  Sparkles,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useNotification } from "@/contexts/NotificationContext";
import { withAuth } from "@/contexts/AuthContext";

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

function SubscriptionPage() {
  const { showNotification } = useNotification();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  useEffect(() => {
    loadPlansAndSubscription();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPlansAndSubscription = async () => {
    try {
      const response = await fetch("/api/subscription/checkout", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("fiorell_auth_token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans || []);
        setUserSubscription(data.userSubscription);
      }
    } catch (error) {
      console.error("Error loading subscription data:", error);
      showNotification("Failed to load subscription plans", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (processingPlan) return;

    try {
      setProcessingPlan(planId);

      const response = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("fiorell_auth_token")}`,
        },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to Lemon Squeezy checkout
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error(data.error || "Failed to create checkout");
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      showNotification(
        error instanceof Error ? error.message : "Failed to start checkout",
        "error"
      );
    } finally {
      setProcessingPlan(null);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const getFeatureIcon = (feature: string) => {
    if (feature.toLowerCase().includes("like")) return <Heart className="h-4 w-4" />;
    if (feature.toLowerCase().includes("boost")) return <Zap className="h-4 w-4" />;
    if (feature.toLowerCase().includes("see") || feature.toLowerCase().includes("view")) return <Eye className="h-4 w-4" />;
    if (feature.toLowerCase().includes("message")) return <MessageCircle className="h-4 w-4" />;
    if (feature.toLowerCase().includes("support")) return <Shield className="h-4 w-4" />;
    if (feature.toLowerCase().includes("incognito") || feature.toLowerCase().includes("travel")) return <Sparkles className="h-4 w-4" />;
    return <Check className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Crown className="h-16 w-16 mx-auto text-yellow-300" />
            <h1 className="text-4xl md:text-5xl font-bold">
              Upgrade Your Dating Experience
            </h1>
            <p className="text-xl text-pink-100 max-w-2xl mx-auto">
              Get unlimited access to premium features and find your perfect match faster
            </p>
          </motion.div>
        </div>
      </div>

      {/* Current Subscription Status */}
      {userSubscription && userSubscription.type !== "free" && (
        <div className="max-w-7xl mx-auto px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 rounded-2xl p-6"
          >
            <div className="flex items-center space-x-3">
              <Crown className="h-6 w-6 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-green-900">
                  You&apos;re currently on {userSubscription.type.replace("_", " ").toUpperCase()}
                </h3>
                <p className="text-green-700">
                  {userSubscription.expiresAt
                    ? `Your subscription expires on ${new Date(userSubscription.expiresAt).toLocaleDateString()}`
                    : "Active subscription"}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Pricing Plans */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Choose Your Perfect Plan
          </h2>
          <p className="text-lg text-gray-600">
            Unlock premium features and supercharge your dating journey
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative bg-white rounded-2xl shadow-lg overflow-hidden ${
                plan.popular ? "ring-2 ring-pink-500" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-center py-2">
                  <div className="flex items-center justify-center space-x-1">
                    <Star className="h-4 w-4" />
                    <span className="text-sm font-semibold">Most Popular</span>
                  </div>
                </div>
              )}

              <div className={`p-6 ${plan.popular ? "pt-16" : ""}`}>
                {/* Plan Header */}
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-baseline justify-center">
                      <span className="text-4xl font-bold text-gray-900">
                        {formatPrice(plan.price)}
                      </span>
                      <span className="text-gray-600 ml-1">
                        /{plan.interval}
                      </span>
                    </div>
                    
                    {plan.savings && (
                      <div className="space-y-1">
                        <div className="text-sm text-gray-500 line-through">
                          {formatPrice(plan.monthlyEquivalentPrice! * (plan.interval === 'year' ? 12 : 1))}
                        </div>
                        <div className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full inline-block">
                          Save {plan.savings.savingsPercentage}%
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center space-x-3">
                      <div className="flex-shrink-0 text-green-500">
                        {getFeatureIcon(feature)}
                      </div>
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Subscribe Button */}
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={processingPlan !== null || (userSubscription?.type !== "free" && userSubscription?.type !== undefined)}
                  className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
                    plan.popular
                      ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600"
                      : "bg-gray-900 text-white hover:bg-gray-800"
                  } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2`}
                >
                  {processingPlan === plan.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : userSubscription?.type !== "free" && userSubscription?.type !== undefined ? (
                    <span>Current Plan</span>
                  ) : (
                    <>
                      <span>Get Started</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Upgrade to Premium?
            </h2>
            <p className="text-lg text-gray-600">
              Join millions of successful premium members
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <div className="bg-pink-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Heart className="h-8 w-8 text-pink-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">3x More Matches</h3>
              <p className="text-gray-600">
                Premium members get 3x more matches than free users with unlimited likes and boosts
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="bg-blue-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Zap className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Skip the Queue</h3>
              <p className="text-gray-600">
                Get priority in discovery and see who liked you first for faster connections
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="bg-green-100 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">VIP Support</h3>
              <p className="text-gray-600">
                Get priority customer support and exclusive access to new features
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* FAQ or additional info could go here */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Find Your Perfect Match?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join thousands of successful couples who found love with our premium features
          </p>
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <Shield className="h-4 w-4" />
            <span>Secure payment powered by Lemon Squeezy</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(SubscriptionPage);