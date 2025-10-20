"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Check, 
  Crown, 
  Star, 
  Heart,
  ArrowRight,
  Gift,
  Zap,
  Eye,
  Filter
} from "lucide-react";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

// Loading component for Suspense fallback
function SuccessLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 text-center"
      >
        <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Zap className="h-8 w-8 text-white" />
          </motion.div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Success Page</h2>
        <p className="text-gray-600">Preparing your subscription details...</p>
      </motion.div>
    </div>
  );
}

function SubscriptionSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [activating, setActivating] = useState(true);
  const [hasActivated, setHasActivated] = useState(false);

  const sessionId = searchParams.get("session");
  const planId = searchParams.get("plan");

  // Plan details
  const planDetails = {
    premium_monthly: { name: "Premium", icon: Star, color: "pink" },
    premium_annual: { name: "Premium", icon: Star, color: "pink" },
    premium_plus_monthly: { name: "Premium Plus", icon: Crown, color: "yellow" },
    premium_plus_annual: { name: "Premium Plus", icon: Crown, color: "yellow" }
  };

  const plan = planDetails[planId as keyof typeof planDetails];

  useEffect(() => {
    // Prevent multiple activations
    if (hasActivated || !planId || !plan) {
      return;
    }

    // Simulate account activation
    const activateAccount = async () => {
      try {
        // In a real app, this would call an API to activate the subscription
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        setActivating(false);
        setHasActivated(true);
        showToast({
          type: "success",
          title: "Subscription Activated!",
          message: `Welcome to ${plan.name}! Your premium features are now active.`
        });
      } catch (error) {
        console.error("Activation error:", error);
        setActivating(false);
        setHasActivated(true);
        showToast({
          type: "error",
          title: "Activation Error",
          message: "There was an issue activating your subscription. Please contact support."
        });
      }
    };

    activateAccount();
  }, [planId, hasActivated, plan, showToast]); // Include all dependencies

  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Session</h1>
          <Button onClick={() => router.push("/dashboard")} variant="outline">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (activating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 text-center"
        >
          <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Zap className="h-8 w-8 text-white" />
            </motion.div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Activating Your Subscription</h2>
          <p className="text-gray-600">Please wait while we activate your premium features...</p>
        </motion.div>
      </div>
    );
  }

  const bgColor = plan.color === "pink" ? "from-pink-500 to-purple-600" : "from-yellow-400 to-orange-500";

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Success Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className={`w-24 h-24 bg-gradient-to-r ${bgColor} rounded-full flex items-center justify-center mx-auto mb-6`}
          >
            <Check className="h-12 w-12 text-white" />
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-4xl font-bold text-gray-900 mb-4"
          >
            Welcome to {plan.name}!
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-xl text-gray-600 mb-2"
          >
            Your subscription has been activated successfully
          </motion.p>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="text-gray-500"
          >
            Session ID: {sessionId}
          </motion.p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
        >
          {plan.name === "Premium Plus" ? (
            <>
              <FeatureCard 
                icon={Heart}
                title="Unlimited Likes & Super Likes"
                description="Like as many profiles as you want, no daily limits"
                delay={1.2}
              />
              <FeatureCard 
                icon={Crown}
                title="Travel Mode"
                description="Change your location to meet people anywhere in the world"
                delay={1.4}
              />
              <FeatureCard 
                icon={Eye}
                title="Incognito Mode"
                description="Browse profiles anonymously without being seen"
                delay={1.6}
              />
              <FeatureCard 
                icon={Gift}
                title="Message Before Matching"
                description="Send messages before you match to stand out"
                delay={1.8}
              />
              <FeatureCard 
                icon={Star}
                title="See Who Liked You"
                description="View everyone who has liked your profile"
                delay={2.0}
              />
              <FeatureCard 
                icon={Zap}
                title="Priority Support"
                description="Get priority customer support when you need help"
                delay={2.2}
              />
            </>
          ) : (
            <>
              <FeatureCard 
                icon={Heart}
                title="Unlimited Likes"
                description="Like as many profiles as you want, no daily limits"
                delay={1.2}
              />
              <FeatureCard 
                icon={Star}
                title="See Who Liked You"
                description="View everyone who has liked your profile"
                delay={1.4}
              />
              <FeatureCard 
                icon={Filter}
                title="Advanced Filters"
                description="Filter by interests, verification status, and more"
                delay={1.6}
              />
              <FeatureCard 
                icon={Check}
                title="Read Receipts"
                description="See when your messages have been read"
                delay={1.8}
              />
              <FeatureCard 
                icon={Gift}
                title="Ad-Free Experience"
                description="Enjoy Fiorell without any advertisements"
                delay={2.0}
              />
              <FeatureCard 
                icon={Zap}
                title="Priority Support"
                description="Get priority customer support when you need help"
                delay={2.2}
              />
            </>
          )}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button
            onClick={() => router.push("/dashboard")}
            className={`bg-gradient-to-r ${bgColor} hover:opacity-90 text-white px-8 py-3 rounded-lg font-semibold flex items-center justify-center gap-2`}
          >
            Start Exploring
            <ArrowRight className="h-4 w-4" />
          </Button>
          
          <Button
            onClick={() => router.push("/settings")}
            variant="outline"
            className="px-8 py-3 rounded-lg font-semibold"
          >
            Manage Subscription
          </Button>
        </motion.div>

        {/* Demo Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3 }}
          className="mt-12 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-md mx-auto"
        >
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-900">Demo Subscription</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            This was a demonstration purchase. In the real app, your subscription would be activated through our payment processor.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  delay: number;
}

function FeatureCard({ icon: Icon, title, description, delay }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white rounded-2xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow"
    >
      <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="h-6 w-6 text-white" />
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </motion.div>
  );
}

// Wrapper component with Suspense boundary
export default function SuccessPage() {
  return (
    <Suspense fallback={<SuccessLoading />}>
      <SubscriptionSuccess />
    </Suspense>
  );
}