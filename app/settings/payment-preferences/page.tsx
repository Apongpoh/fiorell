"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Bitcoin,
  CreditCard,
  Check,
  Save,
  Loader2,
  ArrowLeft,
  Shield,
  Lock,
  Globe,
} from "lucide-react";
import { useNotification } from "@/contexts/NotificationContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Link from "next/link";

interface PaymentPreferences {
  preferredPaymentMethod: "crypto" | "traditional";
  currentPaymentMethod?: "crypto" | "traditional";
}

export default function PaymentPreferencesPage() {
  const [preferences, setPreferences] = useState<PaymentPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<"crypto" | "traditional">("crypto");
  
  const { showNotification } = useNotification();
  const { user: currentUser } = useAuth();

  const fetchPreferences = useCallback(async () => {
    try {
      const response = await fetch("/api/user/payment-preferences", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("fiorell_auth_token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
        setSelectedMethod(data.preferredPaymentMethod);
      } else {
        throw new Error("Failed to fetch preferences");
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
      showNotification("Failed to load payment preferences", "error");
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    if (currentUser) {
      fetchPreferences();
    }
  }, [currentUser, fetchPreferences]);

  const savePreferences = async () => {
    if (!preferences || selectedMethod === preferences.preferredPaymentMethod) {
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/user/payment-preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("fiorell_auth_token")}`,
        },
        body: JSON.stringify({
          preferredPaymentMethod: selectedMethod,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
        showNotification("Payment preferences updated successfully", "success");
      } else {
        throw new Error("Failed to update preferences");
      }
    } catch (error) {
      console.error("Error saving preferences:", error);
      showNotification("Failed to save payment preferences", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Authentication Required
          </h2>
          <p className="text-gray-600 mb-6">
            Please sign in to access payment preferences.
          </p>
          <Link href="/login">
            <Button className="bg-pink-600 hover:bg-pink-700 text-white">
              Sign In
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-12">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/settings"
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Settings
          </Link>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Payment Preferences</h1>
            <p className="text-gray-600">Choose your preferred payment method</p>
          </div>
          <div></div>
        </div>

        {/* Current Payment Method */}
        {preferences?.currentPaymentMethod && (
          <Card className="p-6 mb-8 bg-blue-50 border-blue-200">
            <div className="flex items-center space-x-3">
              {preferences.currentPaymentMethod === "crypto" ? (
                <Bitcoin className="w-6 h-6 text-orange-600" />
              ) : (
                <CreditCard className="w-6 h-6 text-blue-600" />
              )}
              <div>
                <h3 className="text-lg font-semibold text-blue-900">
                  Current Payment Method
                </h3>
                <p className="text-blue-700">
                  Your active subscription uses{" "}
                  {preferences.currentPaymentMethod === "crypto"
                    ? "Cryptocurrency"
                    : "Traditional Payment"}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Payment Method Selection */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Crypto Payment */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="relative"
          >
            <Card
              className={`p-8 cursor-pointer transition-all ${
                selectedMethod === "crypto"
                  ? "border-2 border-blue-500 bg-blue-50"
                  : "border border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => setSelectedMethod("crypto")}
            >
              <div className="absolute top-4 right-4">
                {selectedMethod === "crypto" && (
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bitcoin className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Cryptocurrency
                </h3>
                <p className="text-gray-600">
                  Default - Enhanced privacy and security
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Maximum privacy & anonymity</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Lock className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Lower transaction fees</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Globe className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Global accessibility</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">No chargebacks</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Instant confirmation</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Bitcoin & Monero support</span>
                </div>
              </div>

              {selectedMethod === "crypto" && (
                <div className="mt-6 p-3 bg-blue-100 rounded-lg">
                  <p className="text-blue-800 text-sm font-medium">
                    ✨ Recommended for maximum privacy
                  </p>
                </div>
              )}
            </Card>
          </motion.div>

          {/* Traditional Payment */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="relative"
          >
            <Card
              className={`p-8 cursor-pointer transition-all ${
                selectedMethod === "traditional"
                  ? "border-2 border-blue-500 bg-blue-50"
                  : "border border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => setSelectedMethod("traditional")}
            >
              <div className="absolute top-4 right-4">
                {selectedMethod === "traditional" && (
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Traditional Payment
                </h3>
                <p className="text-gray-600">
                  Credit cards, PayPal, and other methods
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Familiar payment experience</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Credit card rewards</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Dispute protection</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Auto-recurring billing</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Customer support</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Multiple payment options</span>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Save Button */}
        <div className="text-center">
          <Button
            onClick={savePreferences}
            disabled={saving || selectedMethod === preferences?.preferredPaymentMethod}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Preferences
              </>
            )}
          </Button>
          
          {selectedMethod === preferences?.preferredPaymentMethod && (
            <p className="text-gray-500 text-sm mt-2">
              Your preferences are already saved
            </p>
          )}
        </div>

        {/* Info */}
        <Card className="mt-8 p-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-start space-x-3">
            <Settings className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-2">
                How Payment Preferences Work
              </h3>
              <ul className="text-yellow-800 text-sm space-y-1">
                <li>• Your preferred method will be shown first when upgrading</li>
                <li>• You can always choose a different method during checkout</li>
                <li>• Existing subscriptions won&apos;t be affected by this change</li>
                <li>• Crypto payments are processed securely on the blockchain</li>
                <li>• Traditional payments are handled by our secure payment processor</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}