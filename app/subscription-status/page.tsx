"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  Crown,
  Star,
  Plus,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/contexts/NotificationContext";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PaymentRetry from "@/components/PaymentRetry";
import SubscriptionRenewal from "@/components/SubscriptionRenewal";
import { useRouter } from "next/navigation";

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
  planDuration: string;
  createdAt: string;
  confirmedAt?: string;
  expiresAt: string;
}

interface SubscriptionInfo {
  isActive: boolean;
  planType?: string;
  planDuration?: string;
  startDate?: string;
  expiresAt?: string;
  daysRemaining?: number;
}

export default function SubscriptionStatusPage() {
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentHistory | null>(null);

  const { user } = useAuth();
  const { showNotification } = useNotification();
  const router = useRouter();

  const fetchSubscriptionData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("fiorell_auth_token");
      
      // Fetch subscription info and payment history
      const [subscriptionResponse, historyResponse] = await Promise.all([
        fetch("/api/user/subscription", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/crypto/payment-history", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (subscriptionResponse.ok) {
        const subscriptionData = await subscriptionResponse.json();
        setSubscriptionInfo(subscriptionData.subscription);
      }

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setPaymentHistory(historyData.payments || []);
      }
    } catch (error) {
      console.error("Error fetching subscription data:", error);
      showNotification("Failed to load subscription data", "error");
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    if (user) {
      fetchSubscriptionData();
    }
  }, [user, fetchSubscriptionData]);

  const handleRetryPayment = (payment: PaymentHistory) => {
    setSelectedPayment(payment);
    setShowRetryModal(true);
  };

  const handleRetryCreated = (retryPayment: PaymentHistory) => {
    setShowRetryModal(false);
    setSelectedPayment(null);
    fetchSubscriptionData(); // Refresh data
    router.push(`/payment-tracking?ref=${retryPayment.paymentReference}`);
  };

  const handleRenewalCreated = (renewalPayment: PaymentHistory) => {
    setShowRenewalModal(false);
    fetchSubscriptionData(); // Refresh data
    router.push(`/payment-tracking?ref=${renewalPayment.paymentReference}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCrypto = (amount: number, cryptocurrency: string) => {
    const symbol = cryptocurrency === "bitcoin" ? "BTC" : "XMR";
    return `${amount.toFixed(8)} ${symbol}`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "pending":
      case "user_confirmed":
      case "admin_verifying":
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "expired":
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200";
      case "pending":
      case "user_confirmed":
      case "admin_verifying":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      case "expired":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const canRetryPayment = (payment: PaymentHistory) => {
    return ["failed", "expired"].includes(payment.status);
  };

  const isExpiringSoon = () => {
    if (!subscriptionInfo?.daysRemaining) return false;
    return subscriptionInfo.daysRemaining <= 7;
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Subscription Status</h1>
          <p className="text-gray-600 mt-2">
            Manage your subscription and view payment history
          </p>
        </div>

        <div className="space-y-6">
          {/* Current Subscription Status */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                {subscriptionInfo?.isActive ? (
                  <Crown className="w-8 h-8 text-yellow-500" />
                ) : (
                  <Star className="w-8 h-8 text-gray-400" />
                )}
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {subscriptionInfo?.isActive ? "Active Subscription" : "No Active Subscription"}
                  </h2>
                  {subscriptionInfo?.isActive && (
                    <p className="text-gray-600">
                      {subscriptionInfo.planType === "premium" ? "Premium" : "Premium Plus"} Plan
                    </p>
                  )}
                </div>
              </div>
              
              {subscriptionInfo?.isActive && (
                <div className={`px-4 py-2 rounded-lg border ${
                  isExpiringSoon() 
                    ? "bg-orange-100 text-orange-800 border-orange-200" 
                    : "bg-green-100 text-green-800 border-green-200"
                }`}>
                  <span className="font-medium">
                    {subscriptionInfo.daysRemaining} days remaining
                  </span>
                </div>
              )}
            </div>

            {subscriptionInfo?.isActive ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <span className="text-sm font-medium text-gray-500">Plan Type</span>
                  <p className="text-lg font-semibold text-gray-900">
                    {subscriptionInfo.planType === "premium" ? "Premium" : "Premium Plus"}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Duration</span>
                  <p className="text-lg font-semibold text-gray-900">
                    {subscriptionInfo.planDuration?.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Expires</span>
                  <p className={`text-lg font-semibold ${
                    isExpiringSoon() ? "text-orange-600" : "text-gray-900"
                  }`}>
                    {subscriptionInfo.expiresAt && formatDate(subscriptionInfo.expiresAt)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-6">
                  You don&apos;t have an active subscription. Upgrade to Premium for exclusive features!
                </p>
                <Button
                  onClick={() => router.push("/subscription")}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Get Premium
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            {subscriptionInfo?.isActive && (
              <div className="flex space-x-4 mt-6 pt-6 border-t border-gray-200">
                <Button
                  onClick={() => setShowRenewalModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Renew Subscription
                </Button>
                <Button
                  onClick={() => router.push("/subscription")}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Star className="w-4 h-4 mr-2" />
                  Upgrade Plan
                </Button>
              </div>
            )}
          </Card>

          {/* Payment History */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Payment History</h2>
              <Button
                onClick={fetchSubscriptionData}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            {paymentHistory.length > 0 ? (
              <div className="space-y-4">
                {paymentHistory.map((payment) => (
                  <motion.div
                    key={payment.paymentId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(payment.status)}
                        <div>
                          <p className="font-semibold text-gray-900">
                            {payment.planType === "premium" ? "Premium" : "Premium Plus"} 
                            ({payment.planDuration.replace("_", " ")})
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
                  </motion.div>
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
        </div>

        {/* Retry Modal */}
        {showRetryModal && selectedPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <PaymentRetry
              payment={selectedPayment}
              onRetryCreated={handleRetryCreated}
              onClose={() => {
                setShowRetryModal(false);
                setSelectedPayment(null);
              }}
            />
          </div>
        )}

        {/* Renewal Modal */}
        {showRenewalModal && subscriptionInfo && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <SubscriptionRenewal
              currentSubscription={{
                planType: subscriptionInfo.planType || "premium",
                planDuration: subscriptionInfo.planDuration || "1_month",
                expiresAt: subscriptionInfo.expiresAt || "",
                isActive: subscriptionInfo.isActive,
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