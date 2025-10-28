"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  Settings,
  CreditCard,
  Bitcoin,
  Calendar,
  ArrowLeft,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Star,
  Edit,
  Trash2,
  Shield,
  Clock,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/contexts/NotificationContext";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PaymentRetry from "@/components/PaymentRetry";
import SubscriptionRenewal from "@/components/SubscriptionRenewal";
import { useRouter } from "next/navigation";

interface TraditionalSubscription {
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
  paymentMethod: "traditional";
}

interface CryptoSubscription {
  isActive: boolean;
  planType: string;
  planDuration?: string; // Made optional since it might be undefined
  startDate: string;
  expiresAt: string;
  daysRemaining: number;
  features: string[];
  paymentMethod: "crypto";
  preferredCrypto?: string;
}

interface PaymentHistory {
  paymentId: string;
  paymentReference: string;
  cryptocurrency: string;
  amount: number;
  amountUSD: number;
  toAddress: string;
  status: string;
  statusDisplay: string;
  planType: string;
  planDuration?: string; // Made optional since it might be undefined
  createdAt: string;
  confirmedAt?: string;
  expiresAt: string;
}

interface SubscriptionData {
  hasSubscription: boolean;
  subscriptionType: "traditional" | "crypto" | null;
  traditionalSubscription?: TraditionalSubscription;
  cryptoSubscription?: CryptoSubscription;
  paymentHistory?: PaymentHistory[];
}

export default function ComprehensiveSubscriptionManage() {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "settings">("overview");
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentHistory | null>(null);

  const { user } = useAuth();
  const { showNotification } = useNotification();
  const router = useRouter();

  const loadSubscriptionData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("fiorell_auth_token");
      
      // Use the comprehensive API that properly detects payment methods
      const response = await fetch("/api/subscription/comprehensive", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch subscription data");
      }

      const data = await response.json();

      // The comprehensive API already determines the subscription type correctly
      let subscriptionType: "traditional" | "crypto" | null = null;
      let hasSubscription = false;

      if (data.traditionalSubscription) {
        subscriptionType = "traditional";
        hasSubscription = true;
      } else if (data.cryptoSubscription) {
        subscriptionType = "crypto";
        hasSubscription = true;
      }

      setSubscriptionData({
        hasSubscription,
        subscriptionType,
        traditionalSubscription: data.traditionalSubscription,
        cryptoSubscription: data.cryptoSubscription,
        paymentHistory: data.paymentHistory || [],
      });

    } catch (error) {
      console.error("Error loading subscription data:", error);
      showNotification("Failed to load subscription data", "error");
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    if (user) {
      loadSubscriptionData();
    }
  }, [user, loadSubscriptionData]);

  const handleCancelTraditionalSubscription = async () => {
    if (!subscriptionData?.traditionalSubscription || actionLoading) return;

    const confirmed = window.confirm(
      "Are you sure you want to cancel your subscription? You'll still have access until the end of your current billing period."
    );

    if (!confirmed) return;

    try {
      setActionLoading("cancel");
      const token = localStorage.getItem("fiorell_auth_token");

      const response = await fetch("/api/subscription/manage", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        showNotification("Subscription cancelled successfully", "success");
        await loadSubscriptionData();
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to cancel subscription");
      }
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      showNotification(
        error instanceof Error ? error.message : "Failed to cancel subscription",
        "error"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleResumeTraditionalSubscription = async () => {
    if (!subscriptionData?.traditionalSubscription || actionLoading) return;

    try {
      setActionLoading("resume");
      const token = localStorage.getItem("fiorell_auth_token");

      const response = await fetch("/api/subscription/manage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "resume" }),
      });

      if (response.ok) {
        showNotification("Subscription resumed successfully", "success");
        await loadSubscriptionData();
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to resume subscription");
      }
    } catch (error) {
      console.error("Error resuming subscription:", error);
      showNotification(
        error instanceof Error ? error.message : "Failed to resume subscription",
        "error"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleRetryPayment = (payment: PaymentHistory) => {
    setSelectedPayment(payment);
    setShowRetryModal(true);
  };

  const handleRetryCreated = (retryPayment: PaymentHistory) => {
    setShowRetryModal(false);
    setSelectedPayment(null);
    loadSubscriptionData();
    router.push(`/payment-tracking?ref=${retryPayment.paymentReference}`);
  };

  const handleRenewalCreated = (renewalPayment: PaymentHistory) => {
    setShowRenewalModal(false);
    loadSubscriptionData();
    router.push(`/payment-tracking?ref=${renewalPayment.paymentReference}`);
  };

  const formatPrice = (price: number, currency: string = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCrypto = (amount: number, cryptocurrency: string) => {
    const symbol = cryptocurrency === "bitcoin" ? "BTC" : "XMR";
    return `${amount.toFixed(8)} ${symbol}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "on_trial":
      case "pending":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
      case "expired":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "past_due":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
      case "confirmed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "pending":
      case "on_trial":
        return <Clock className="w-5 h-5 text-blue-500" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "expired":
      case "cancelled":
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const canRetryPayment = (payment: PaymentHistory) => {
    return ["failed", "expired"].includes(payment.status);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading subscription data...</p>
        </div>
      </div>
    );
  }

  if (!subscriptionData?.hasSubscription) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="text-center">
            <Crown className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              No Active Subscription
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              You don&apos;t have an active subscription. Choose from our premium plans to unlock exclusive features!
            </p>
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-8">
              <Card className="p-6 border-2 border-blue-500">
                <div className="text-center">
                  <Bitcoin className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Crypto Payment</h3>
                  <p className="text-gray-600 mb-4">Pay with Bitcoin or Monero for maximum privacy</p>
                  <Button
                    onClick={() => router.push("/subscription/crypto")}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Choose Crypto
                  </Button>
                </div>
              </Card>
              <Card className="p-6">
                <div className="text-center">
                  <CreditCard className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Traditional Payment</h3>
                  <p className="text-gray-600 mb-4">Credit card, PayPal, and other methods</p>
                  <Button
                    onClick={() => router.push("/subscription")}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white"
                  >
                    Choose Traditional
                  </Button>
                </div>
              </Card>
            </div>
            <Button
              onClick={() => router.push("/profile")}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const activeSubscription = subscriptionData.subscriptionType === "traditional" 
    ? subscriptionData.traditionalSubscription 
    : subscriptionData.cryptoSubscription;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <Button
              onClick={() => router.push("/profile")}
              className="flex items-center space-x-2 text-gray-600 hover:text-blue-600"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Profile</span>
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
            <div className="flex items-center space-x-2">
              {subscriptionData.subscriptionType === "crypto" ? (
                <Bitcoin className="w-6 h-6 text-orange-500" />
              ) : (
                <CreditCard className="w-6 h-6 text-blue-500" />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {["overview", "history", "settings"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as "overview" | "history" | "settings")}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </nav>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Current Subscription Overview */}
              <Card className="overflow-hidden">
                <div className={`p-6 ${
                  subscriptionData.subscriptionType === "crypto" 
                    ? "bg-gradient-to-r from-orange-500 to-yellow-500" 
                    : "bg-gradient-to-r from-blue-500 to-purple-500"
                } text-white`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {subscriptionData.subscriptionType === "crypto" ? (
                        <Bitcoin className="w-8 h-8" />
                      ) : (
                        <Crown className="w-8 h-8" />
                      )}
                      <div>
                        <h2 className="text-2xl font-bold">
                          {subscriptionData.subscriptionType === "traditional"
                            ? subscriptionData.traditionalSubscription?.planName
                            : `${subscriptionData.cryptoSubscription?.planType === "premium" ? "Premium" : "Premium Plus"} (Crypto)`}
                        </h2>
                        <p className="text-white/80">
                          {subscriptionData.subscriptionType === "traditional"
                            ? `${formatPrice(subscriptionData.traditionalSubscription?.price || 0)} per ${subscriptionData.traditionalSubscription?.interval}`
                            : `${subscriptionData.cryptoSubscription?.planDuration?.replace("_", " ") || "monthly"} plan`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white/80 text-sm">Payment Method</div>
                      <div className="font-semibold">
                        {subscriptionData.subscriptionType === "crypto" ? "Cryptocurrency" : "Traditional"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Status and Expiry */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Status</label>
                      <div className="flex items-center space-x-2">
                        {subscriptionData.subscriptionType === "traditional" 
                          ? getStatusIcon(subscriptionData.traditionalSubscription?.status || "")
                          : getStatusIcon("active")}
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          subscriptionData.subscriptionType === "traditional"
                            ? getStatusColor(subscriptionData.traditionalSubscription?.status || "")
                            : getStatusColor("active")
                        }`}>
                          {subscriptionData.subscriptionType === "traditional"
                            ? (subscriptionData.traditionalSubscription?.status || "").charAt(0).toUpperCase() + 
                              (subscriptionData.traditionalSubscription?.status || "").slice(1)
                            : "Active"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Expires</label>
                      <div className="text-lg font-semibold text-gray-900">
                        {subscriptionData.subscriptionType === "traditional"
                          ? formatDate(subscriptionData.traditionalSubscription?.currentPeriodEnd || "")
                          : formatDate(subscriptionData.cryptoSubscription?.expiresAt || "")}
                      </div>
                      <div className="text-sm text-gray-500">
                        {(subscriptionData.subscriptionType === "traditional" 
                          ? subscriptionData.traditionalSubscription?.daysRemaining 
                          : subscriptionData.cryptoSubscription?.daysRemaining) || 0} days remaining
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Premium Features</h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {(activeSubscription as TraditionalSubscription | CryptoSubscription)?.features?.map((feature: string, index: number) => (
                        <div key={index} className="flex items-center space-x-3">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200">
                    {subscriptionData.subscriptionType === "crypto" && (
                      <Button
                        onClick={() => setShowRenewalModal(true)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Renew Subscription
                      </Button>
                    )}
                    <Button
                      onClick={() => router.push("/subscription")}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Upgrade Plan
                    </Button>
                    <Button
                      onClick={loadSubscriptionData}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Payment History</h2>
                
                {subscriptionData.paymentHistory && subscriptionData.paymentHistory.length > 0 ? (
                  <div className="space-y-4">
                    {subscriptionData.paymentHistory.map((payment) => (
                      <div
                        key={payment.paymentId}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(payment.status)}
                            <div>
                              <p className="font-semibold text-gray-900">
                                {payment.planType === "premium" ? "Premium" : "Premium Plus"} 
                                ({payment.planDuration?.replace("_", " ") || "monthly"})
                              </p>
                              <p className="text-sm text-gray-600">
                                {payment.paymentReference}
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className={`inline-flex px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(payment.status)}`}>
                              {payment.statusDisplay}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {formatCrypto(payment.amount, payment.cryptocurrency)} (${payment.amountUSD})
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <div className="text-sm text-gray-600">
                            Created: {formatDate(payment.createdAt)}
                            {payment.confirmedAt && (
                              <span className="ml-4">
                                Confirmed: {formatDate(payment.confirmedAt)}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => router.push(`/payment-tracking?ref=${payment.paymentReference}`)}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1"
                            >
                              <CreditCard className="w-3 h-3 mr-1" />
                              View
                            </Button>
                            
                            {canRetryPayment(payment) && (
                              <Button
                                onClick={() => handleRetryPayment(payment)}
                                className="bg-orange-600 hover:bg-orange-700 text-white text-sm px-3 py-1"
                              >
                                <RefreshCw className="w-3 h-3 mr-1" />
                                Retry
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">No payment history found</p>
                    <Button
                      onClick={() => router.push("/subscription")}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Make Your First Payment
                    </Button>
                  </div>
                )}
              </Card>
            </motion.div>
          )}

          {activeTab === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card className="p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Subscription Settings</h2>
                
                <div className="space-y-6">
                  {/* Payment Method Switch */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Settings className="w-5 h-5 text-gray-400" />
                        <div>
                          <h4 className="font-medium text-gray-900">Payment Method</h4>
                          <p className="text-sm text-gray-600">
                            Currently using {subscriptionData.subscriptionType === "crypto" ? "cryptocurrency" : "traditional"} payments
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => router.push("/subscription")}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Change Method
                      </Button>
                    </div>
                  </div>

                  {/* Traditional Subscription Actions */}
                  {subscriptionData.subscriptionType === "traditional" && (
                    <>
                      {/* Billing Portal */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <ExternalLink className="w-5 h-5 text-gray-400" />
                            <div>
                              <h4 className="font-medium text-gray-900">Billing Portal</h4>
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
                      </div>

                      {/* Cancel/Resume */}
                      {subscriptionData.traditionalSubscription?.isActive && (
                        <div className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {subscriptionData.traditionalSubscription.cancelAtPeriodEnd ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              ) : (
                                <Trash2 className="w-5 h-5 text-red-500" />
                              )}
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {subscriptionData.traditionalSubscription.cancelAtPeriodEnd
                                    ? "Resume Subscription"
                                    : "Cancel Subscription"}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {subscriptionData.traditionalSubscription.cancelAtPeriodEnd
                                    ? "Reactivate your subscription"
                                    : "Cancel at the end of your billing period"}
                                </p>
                              </div>
                            </div>
                            <Button
                              onClick={
                                subscriptionData.traditionalSubscription.cancelAtPeriodEnd
                                  ? handleResumeTraditionalSubscription
                                  : handleCancelTraditionalSubscription
                              }
                              disabled={actionLoading !== null}
                              className={`${
                                subscriptionData.traditionalSubscription.cancelAtPeriodEnd
                                  ? "bg-green-600 hover:bg-green-700"
                                  : "bg-red-600 hover:bg-red-700"
                              } text-white`}
                            >
                              {actionLoading ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  {subscriptionData.traditionalSubscription.cancelAtPeriodEnd ? (
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                  ) : (
                                    <Trash2 className="w-4 h-4 mr-2" />
                                  )}
                                  {subscriptionData.traditionalSubscription.cancelAtPeriodEnd ? "Resume" : "Cancel"}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Privacy & Security */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Shield className="w-5 h-5 text-gray-400" />
                        <div>
                          <h4 className="font-medium text-gray-900">Privacy & Security</h4>
                          <p className="text-sm text-gray-600">
                            Manage your subscription privacy settings
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={() => router.push("/settings/privacy")}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Retry Modal */}
        {showRetryModal && selectedPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <PaymentRetry
              payment={{
                ...selectedPayment,
                planDuration: selectedPayment.planDuration ?? "monthly",
              }}
              onRetryCreated={handleRetryCreated}
              onClose={() => {
                setShowRetryModal(false);
                setSelectedPayment(null);
              }}
            />
          </div>
        )}

        {/* Renewal Modal */}
        {showRenewalModal && subscriptionData.cryptoSubscription && (
          <div className="fixed inset-0 bg-white/30 backdrop-blur flex items-center justify-center z-50 p-4">
            <SubscriptionRenewal
              currentSubscription={{
                planType: subscriptionData.cryptoSubscription.planType,
                planDuration: subscriptionData.cryptoSubscription.planDuration || "1_month",
                expiresAt: subscriptionData.cryptoSubscription.expiresAt,
                isActive: subscriptionData.cryptoSubscription.isActive,
              }}
              onRenewalCreated={handleRenewalCreated}
              onClose={() => setShowRenewalModal(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}