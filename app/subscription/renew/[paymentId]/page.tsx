"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useNotification } from "@/contexts/NotificationContext";
import CryptoPaymentCheckout from "@/components/CryptoPaymentCheckout";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface RenewalPayment {
  paymentId: string;
  cryptocurrency: string;
  amount: number;
  amountUSD: number;
  paymentAddress: string;
  qrCode?: string;
  expiresAt: string;
  planType: string;
  status: string;
  subscriptionId: string;
}

export default function SubscriptionRenewalPage() {
  const params = useParams();
  const paymentId = params.paymentId as string;
  const { showNotification } = useNotification();
  
  const [payment, setPayment] = useState<RenewalPayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  const fetchPaymentDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/subscription/renewal/${paymentId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch payment details');
      }
      const data = await response.json();
      setPayment(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load payment details';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [paymentId]);

  const updateTimeRemaining = useCallback(() => {
    if (!payment?.expiresAt) return;
    
    const now = new Date();
    const expiry = new Date(payment.expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) {
      setTimeRemaining("Payment expired");
      return;
    }
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
  }, [payment?.expiresAt]);

  useEffect(() => {
    fetchPaymentDetails();
  }, [fetchPaymentDetails]);

  useEffect(() => {
    if (payment?.expiresAt) {
      const timer = setInterval(updateTimeRemaining, 1000);
      return () => clearInterval(timer);
    }
  }, [payment?.expiresAt, updateTimeRemaining]);

  const handlePaymentConfirmed = () => {
    showNotification("Payment confirmed! Your subscription has been renewed.", "success");
    window.location.href = "/subscription/manage";
  };

  const handleCancel = () => {
    window.location.href = "/subscription/manage";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-12">
        <div className="max-w-2xl mx-auto px-6">
          <Card className="p-8 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Not Found</h1>
            <p className="text-gray-600 mb-6">
              {error || "This payment link may have expired or is invalid."}
            </p>
            <Button
              onClick={() => window.location.href = "/subscription/manage"}
              className="bg-pink-600 hover:bg-pink-700 text-white"
            >
              Go to Subscription Management
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  if (payment.status === "confirmed") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-12">
        <div className="max-w-2xl mx-auto px-6">
          <Card className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Confirmed!</h1>
            <p className="text-gray-600 mb-6">
              Your subscription has been successfully renewed. Thank you for your payment!
            </p>
            <Button
              onClick={() => window.location.href = "/subscription/manage"}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              View Subscription Details
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const isExpired = timeRemaining === "Expired" || new Date() > new Date(payment.expiresAt);

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-12">
        <div className="max-w-2xl mx-auto px-6">
          <Card className="p-8 text-center">
            <Clock className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Expired</h1>
            <p className="text-gray-600 mb-6">
              This payment request has expired. Please contact support to renew your subscription.
            </p>
            <div className="flex space-x-4 justify-center">
              <Button
                onClick={() => window.location.href = "/support"}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Contact Support
              </Button>
              <Button
                onClick={() => window.location.href = "/subscription/manage"}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700"
              >
                Subscription Management
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-12">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔔 Subscription Renewal
          </h1>
          <p className="text-gray-600">
            Complete your {payment.planType.replace('_', ' ')} subscription renewal
          </p>
        </div>

        {/* Time Remaining Alert */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="p-4 bg-yellow-50 border-yellow-200">
            <div className="flex items-center justify-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="font-semibold text-yellow-800">
                Time Remaining: {timeRemaining}
              </span>
            </div>
          </Card>
        </motion.div>

        {/* Payment Checkout */}
        <CryptoPaymentCheckout
          paymentData={{
            paymentId: payment.paymentId,
            cryptocurrency: payment.cryptocurrency,
            amount: payment.amount,
            paymentAddress: payment.paymentAddress,
            qrCode: payment.qrCode,
            expiresAt: payment.expiresAt,
            planType: payment.planType,
            amountUSD: payment.amountUSD,
          }}
          onPaymentConfirmed={handlePaymentConfirmed}
          onCancel={handleCancel}
        />

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 text-center"
        >
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Quick Tips</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use the &quot;Open Wallet&quot; button to launch Cake Wallet directly</li>
              <li>• Send the exact amount shown to avoid processing delays</li>
              <li>• Your subscription will renew automatically once payment is confirmed</li>
              <li>• Contact support if you need help with your payment</li>
            </ul>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}