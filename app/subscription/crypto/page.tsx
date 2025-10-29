"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  Check,
  CreditCard,
  Bitcoin,
  ArrowRight,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useNotification } from "@/contexts/NotificationContext";
import { useAuth } from "@/contexts/AuthContext";
import CryptoPaymentSelector from "@/components/CryptoPaymentSelector";
import CryptoPaymentCheckout from "@/components/CryptoPaymentCheckout";
import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

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

interface CryptoPaymentData {
  paymentId: string;
  paymentReference?: string; // NEW: Payment reference for tracking
  cryptocurrency: string;
  amount: number;
  amountSat?: number; // NEW: Amount in satoshis for Bitcoin
  expectedAmountSat?: number; // NEW: Expected amount for verification
  paymentAddress: string;
  qrCode?: string;
  expiresAt: string;
  planType: string;
  amountUSD: number;
}

type PaymentMethod = "crypto" | "traditional";
type PaymentStep = "method_selection" | "plan_selection" | "crypto_checkout" | "traditional_checkout";

const CRYPTO_BENEFITS = [
  "Enhanced privacy and anonymity",
  "Lower transaction fees",
  "No chargebacks or payment disputes",
  "Global accessibility",
  "Instant confirmation",
  "No bank intermediaries",
];

const TRADITIONAL_BENEFITS = [
  "Familiar payment experience",
  "Credit card rewards",
  "Dispute protection",
  "Automatic recurring billing",
  "Customer support",
];

export default function SubscriptionPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("crypto");
  const [currentStep, setCurrentStep] = useState<PaymentStep>("method_selection");
  const [cryptoPaymentData, setCryptoPaymentData] = useState<CryptoPaymentData | null>(null);
  const [showTraditionalOptions, setShowTraditionalOptions] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const { showNotification } = useNotification();
  const { user: currentUser } = useAuth();

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

  const handleCryptoPaymentSelect = async (paymentData: {
    cryptocurrency: string;
    planType: string;
    billingCycle: string;
    amountCrypto: number;
    amountUSD: number;
  }) => {
    if (!mounted) return;
    
    console.log("handleCryptoPaymentSelect called with:", paymentData);

    try {
      setProcessingPlan("crypto_" + paymentData.planType);
      const token = getAuthToken();

      // changed: normalize to backend-expected values
      const normalizedPlanDuration =
        paymentData.billingCycle === "1_year" ? "annual" :
        paymentData.billingCycle === "1_month" ? "monthly" :
        paymentData.billingCycle;

      const response = await fetch("/api/crypto/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cryptocurrency: paymentData.cryptocurrency,
          planType: paymentData.planType,
          planDuration: normalizedPlanDuration, // changed
          isRecurring: true,
        }),
      });

      console.log("API response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Payment data received:", data);
        setCryptoPaymentData(data.payment);
        setCurrentStep("crypto_checkout");
      } else {
        const error = await response.json();
        console.log("API error:", error);
        throw new Error(error.error || "Failed to create crypto payment");
      }
    } catch (error) {
      console.error("Error creating crypto payment:", error);
      showNotification(
        error instanceof Error ? error.message : "Failed to create payment",
        "error"
      );
    } finally {
      setProcessingPlan(null);
    }
  };

  const handleTraditionalCheckout = async (planId: string) => {
    if (!mounted) return;
    
    if (!currentUser) {
      showNotification("Please sign in to upgrade to premium", "error");
      window.location.href = `/login?redirect=${encodeURIComponent("/subscription")}`;
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

      if (response.ok) {
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

  const handlePaymentConfirmed = () => {
    showNotification("Payment confirmed! Welcome to premium!", "success");
    setCurrentStep("method_selection");
    setCryptoPaymentData(null);
    fetchUserSubscription();
  };

  const handleCancelPayment = () => {
    setCurrentStep("plan_selection");
    setCryptoPaymentData(null);
  };

  const resetFlow = () => {
    setCurrentStep("method_selection");
    setCryptoPaymentData(null);
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pink-600" />
      </div>
    );
  }

  // Step 1: Payment Method Selection
  if (currentStep === "method_selection") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Choose Your Payment Method
            </h1>
            <p className="text-xl text-gray-600">
              Secure, private, and convenient ways to upgrade to premium
            </p>
          </div>

          {userSubscription && (
            <Card className="mb-8 p-6 bg-green-50 border-green-200">
              <div className="flex items-center space-x-3">
                <Crown className="h-6 w-6 text-green-600" />
                <div>
                  <h3 className="text-lg font-semibold text-green-900">
                    You&apos;re currently on{" "}
                    {userSubscription.type.replace("_", " ").toUpperCase()}
                  </h3>
                  <p className="text-green-700">
                    {userSubscription.expiresAt
                      ? `Your subscription expires on ${new Date(
                          userSubscription.expiresAt
                        ).toLocaleDateString()}`
                      : "Active subscription"}
                  </p>
                </div>
              </div>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Crypto Payment - Default & Recommended */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="relative"
            >
              <Card className="p-8 border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Recommended
                  </div>
                </div>
                
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bitcoin className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Cryptocurrency Payment
                  </h3>
                  <p className="text-gray-600">
                    Pay with Bitcoin or Monero for maximum privacy
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  {CRYPTO_BENEFITS.map((benefit, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">{benefit}</span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => {
                    setSelectedPaymentMethod("crypto");
                    setCurrentStep("plan_selection");
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold"
                >
                  Choose Crypto Payment
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Card>
            </motion.div>

            {/* Traditional Payment */}
            <motion.div
              whileHover={{ scale: 1.02 }}
            >
              <Card className="p-8 border border-gray-200">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Traditional Payment
                  </h3>
                  <p className="text-gray-600">
                    Credit card, PayPal, and other traditional methods
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  <button
                    onClick={() => setShowTraditionalOptions(!showTraditionalOptions)}
                    className="flex items-center justify-between w-full text-gray-700 hover:text-gray-900"
                  >
                    <span>View benefits</span>
                    {showTraditionalOptions ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  
                  <AnimatePresence>
                    {showTraditionalOptions && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-3"
                      >
                        {TRADITIONAL_BENEFITS.map((benefit, index) => (
                          <div key={index} className="flex items-center space-x-3">
                            <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                            <span className="text-gray-700">{benefit}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Button
                  onClick={() => {
                    setSelectedPaymentMethod("traditional");
                    setCurrentStep("traditional_checkout");
                  }}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-semibold"
                >
                  Choose Traditional Payment
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Card>
            </motion.div>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-500">
              All payments are secure and encrypted. Choose the method that works best for you.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Plan Selection (for crypto)
  if (currentStep === "plan_selection" && selectedPaymentMethod === "crypto") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-8">
            <button
              onClick={resetFlow}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              ← Back to payment methods
            </button>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Select Your Crypto Plan
            </h1>
            <p className="text-gray-600">
              Choose your subscription plan and cryptocurrency
            </p>
          </div>

          <CryptoPaymentSelector
            onPlanSelect={handleCryptoPaymentSelect}
            loading={processingPlan !== null}
          />
        </div>
      </div>
    );
  }

  // Step 3: Crypto Checkout
  if (currentStep === "crypto_checkout" && cryptoPaymentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-12">
        <CryptoPaymentCheckout
          paymentData={cryptoPaymentData}
          onPaymentConfirmed={handlePaymentConfirmed}
          onCancel={handleCancelPayment}
        />
      </div>
    );
  }

  // Step 4: Traditional Checkout (existing flow)
  if (currentStep === "traditional_checkout") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-8">
            <button
              onClick={resetFlow}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              ← Back to payment methods
            </button>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Traditional Payment Plans
            </h1>
            <p className="text-gray-600">
              Choose your subscription plan
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <motion.div
                key={plan.id}
                whileHover={{ scale: 1.02 }}
                className={`relative ${plan.popular ? "lg:scale-105" : ""}`}
              >
                <Card className={`p-8 ${plan.popular ? "border-2 border-pink-500 bg-pink-50" : "border border-gray-200"}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <div className="bg-pink-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                        Most Popular
                      </div>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <p className="text-gray-600 mb-4">{plan.description}</p>
                    
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-gray-900">
                        ${plan.price}
                      </span>
                      <span className="text-gray-600">/{plan.interval}</span>
                    </div>

                    {plan.savings && (
                      <div className="text-green-600 font-medium">
                        Save ${plan.savings.savingsAmount} ({plan.savings.savingsPercentage}% off)
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 mb-8">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => handleTraditionalCheckout(plan.id)}
                    disabled={processingPlan === plan.id}
                    className={`w-full py-3 rounded-lg font-semibold ${
                      plan.popular
                        ? "bg-pink-600 hover:bg-pink-700 text-white"
                        : "bg-gray-600 hover:bg-gray-700 text-white"
                    }`}
                  >
                    {processingPlan === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Choose Plan
                      </>
                    )}
                  </Button>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}