"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Crown,
  Check,
  Settings,
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useNotification } from "@/contexts/NotificationContext";
import { withAuth } from "@/contexts/AuthContext";

interface Subscription {
  id: string;
  planId: string;
  planName: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  price: number;
  currency: string;
  interval: string;
  isActive: boolean;
  isInTrial: boolean;
  daysRemaining: number;
  features: string[];
}

function SubscriptionManagePage() {
  const { showNotification } = useNotification();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadSubscription();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadSubscription = async () => {
    try {
      const response = await fetch("/api/subscription/manage", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("fiorell_auth_token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHasSubscription(data.hasSubscription);
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error("Error loading subscription:", error);
      showNotification("Failed to load subscription details", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription || actionLoading) return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel your subscription? You&apos;ll still have access until the end of your current billing period."
    );

    if (!confirmed) return;

    try {
      setActionLoading("cancel");

      const response = await fetch("/api/subscription/manage", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("fiorell_auth_token")}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        showNotification("Subscription cancelled successfully", "success");
        await loadSubscription(); // Reload to get updated status
      } else {
        throw new Error(data.error || "Failed to cancel subscription");
      }
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      showNotification(
        error instanceof Error
          ? error.message
          : "Failed to cancel subscription",
        "error"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleResumeSubscription = async () => {
    if (!subscription || actionLoading) return;

    try {
      setActionLoading("resume");

      const response = await fetch("/api/subscription/manage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("fiorell_auth_token")}`,
        },
        body: JSON.stringify({ action: "resume" }),
      });

      const data = await response.json();

      if (response.ok) {
        showNotification("Subscription resumed successfully", "success");
        await loadSubscription(); // Reload to get updated status
      } else {
        throw new Error(data.error || "Failed to resume subscription");
      }
    } catch (error) {
      console.error("Error resuming subscription:", error);
      showNotification(
        error instanceof Error
          ? error.message
          : "Failed to resume subscription",
        "error"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const formatPrice = (price: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(price);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "on_trial":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-yellow-100 text-yellow-800";
      case "expired":
        return "bg-red-100 text-red-800";
      case "past_due":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-pink-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  if (!hasSubscription) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="text-center">
            <Crown className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              No Active Subscription
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              You don&apos;t have an active subscription. Upgrade to premium to
              unlock exclusive features!
            </p>
            <div className="space-y-4">
              <Link
                href="/subscription"
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-rose-600 transition-all duration-200"
              >
                <Crown className="h-5 w-5" />
                <span>View Premium Plans</span>
              </Link>
              <div className="block">
                <Link
                  href="/profile"
                  className="inline-flex items-center space-x-2 text-gray-600 hover:text-pink-600 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Profile</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <Link
              href="/profile"
              className="flex items-center space-x-2 text-gray-600 hover:text-pink-600 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Profile</span>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Subscription Management
            </h1>
            <div></div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {subscription && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Subscription Overview */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white p-6">
                <div className="flex items-center space-x-3">
                  <Crown className="h-8 w-8" />
                  <div>
                    <h2 className="text-2xl font-bold">
                      {subscription.planName}
                    </h2>
                    <p className="text-pink-100">
                      {formatPrice(subscription.price)} per{" "}
                      {subscription.interval}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 font-medium">Status</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      subscription.status
                    )}`}
                  >
                    {subscription.status.charAt(0).toUpperCase() +
                      subscription.status.slice(1)}
                  </span>
                </div>

                {/* Billing Period */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 font-medium">
                    Current Period
                  </span>
                  <div className="text-right">
                    <div className="text-sm text-gray-900">
                      {new Date(
                        subscription.currentPeriodStart
                      ).toLocaleDateString()}{" "}
                      -{" "}
                      {new Date(
                        subscription.currentPeriodEnd
                      ).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      {subscription.daysRemaining > 0
                        ? `${subscription.daysRemaining} days remaining`
                        : "Expired"}
                    </div>
                  </div>
                </div>

                {/* Next Billing */}
                {subscription.isActive && !subscription.cancelAtPeriodEnd && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700 font-medium">
                      Next Billing
                    </span>
                    <div className="text-right">
                      <div className="text-sm text-gray-900">
                        {new Date(
                          subscription.currentPeriodEnd
                        ).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatPrice(subscription.price)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Trial Info */}
                {subscription.isInTrial && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-blue-600" />
                      <span className="text-blue-900 font-medium">
                        You&apos;re in your free trial period
                      </span>
                    </div>
                  </div>
                )}

                {/* Cancellation Notice */}
                {subscription.cancelAtPeriodEnd && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <div>
                        <span className="text-yellow-900 font-medium">
                          Subscription Cancelled
                        </span>
                        <p className="text-yellow-800 text-sm mt-1">
                          Your subscription will end on{" "}
                          {new Date(
                            subscription.currentPeriodEnd
                          ).toLocaleDateString()}
                          . You&apos;ll still have access to premium features
                          until then.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Features */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Your Premium Features
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {subscription.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Manage Subscription
              </h3>
              <div className="space-y-4">
                {/* Customer Portal */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <ExternalLink className="h-5 w-5 text-gray-400" />
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Billing Portal
                      </h4>
                      <p className="text-sm text-gray-600">
                        Update payment method, download invoices
                      </p>
                    </div>
                  </div>
                  <a
                    href="https://app.lemonsqueezy.com/my-orders"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Open Portal
                  </a>
                </div>

                {/* Cancel/Resume */}
                {subscription.isActive && (
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Settings className="h-5 w-5 text-gray-400" />
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {subscription.cancelAtPeriodEnd
                            ? "Resume Subscription"
                            : "Cancel Subscription"}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {subscription.cancelAtPeriodEnd
                            ? "Reactivate your subscription"
                            : "Cancel at the end of your billing period"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={
                        subscription.cancelAtPeriodEnd
                          ? handleResumeSubscription
                          : handleCancelSubscription
                      }
                      disabled={actionLoading !== null}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                        subscription.cancelAtPeriodEnd
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-red-600 text-white hover:bg-red-700"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {actionLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <span>
                          {subscription.cancelAtPeriodEnd ? "Resume" : "Cancel"}
                        </span>
                      )}
                    </button>
                  </div>
                )}

                {/* Upgrade */}
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Crown className="h-5 w-5 text-gray-400" />
                    <div>
                      <h4 className="font-medium text-gray-900">Change Plan</h4>
                      <p className="text-sm text-gray-600">
                        Upgrade or downgrade your subscription
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/subscription"
                    className="px-4 py-2 text-sm font-medium text-pink-600 bg-pink-50 rounded-lg hover:bg-pink-100 transition-colors"
                  >
                    View Plans
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default withAuth(SubscriptionManagePage);
