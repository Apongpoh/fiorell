import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface CryptoPaymentSelectorProps {
  onPlanSelect: (plan: {
    cryptocurrency: string;
    planType: string;
    billingCycle: "monthly" | "annual"; // changed: enforce expected values
    amountCrypto: number;
    amountUSD: number;
  }) => void;
  loading?: boolean;
}

interface PricingData {
  bitcoin: number;
  monero: number;
}

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

export default function CryptoPaymentSelector({
  onPlanSelect,
  loading = false,
}: CryptoPaymentSelectorProps) {
  const [selectedCrypto, setSelectedCrypto] = useState<"bitcoin" | "monero">("bitcoin");
  const [selectedPlan, setSelectedPlan] = useState<string>("premium_monthly");
  const [cryptoPrices, setCryptoPrices] = useState<PricingData | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  
  useEffect(() => {
    fetchCryptoPrices();
    fetchPlans();
  }, []);
  
  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/subscription/plans");
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans);
      }
    } catch (error) {
      console.error("Failed to fetch plans:", error);
    } finally {
      setLoadingPlans(false);
    }
  };
  
  const fetchCryptoPrices = async () => {
    try {
      const response = await fetch("/api/crypto/prices");
      if (response.ok) {
        const data = await response.json();
        setCryptoPrices(data.prices);
      }
    } catch (error) {
      console.error("Failed to fetch crypto prices:", error);
    } finally {
      setLoadingPrices(false);
    }
  };
  
  const getSelectedPlan = () => {
    return plans.find(plan => plan.id === selectedPlan);
  };
  
  const calculateCryptoAmount = () => {
    if (!cryptoPrices) return 0;
    
    const plan = getSelectedPlan();
    if (!plan) return 0;
    
    const usdAmount = plan.price;
    const cryptoPrice = cryptoPrices[selectedCrypto];
    
    return usdAmount / cryptoPrice;
  };
  
  const handleSubscribe = () => {
    
    const plan = getSelectedPlan();
    if (!plan) return;
    
    const usdAmount = plan.price;
    const cryptoAmount = calculateCryptoAmount();
    
    // Convert plan ID to format expected by backend
    const planType = selectedPlan.includes("premium_plus") ? "premium_plus" : "premium";
    const planDuration: "monthly" | "annual" = selectedPlan.includes("annual") ? "annual" : "monthly"; // changed
    
    onPlanSelect({
      cryptocurrency: selectedCrypto,
      planType: planType,
      billingCycle: planDuration, // changed
      amountCrypto: cryptoAmount,
      amountUSD: usdAmount,
    });
  };
  
  const getCryptoSymbol = (crypto: string) => {
    return crypto === "bitcoin" ? "BTC" : "XMR";
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Choose Your Cryptocurrency Subscription
        </h2>
        <p className="text-gray-600">
          Pay with Bitcoin or Monero for enhanced privacy and security
        </p>
      </div>
      
      {/* Cryptocurrency Selection */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">1. Select Cryptocurrency</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setSelectedCrypto("bitcoin")}
            className={`p-4 border rounded-lg flex items-center space-x-3 transition-colors ${
              selectedCrypto === "bitcoin"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
              ₿
            </div>
            <div className="text-left">
              <div className="font-semibold">Bitcoin (BTC)</div>
              <div className="text-sm text-gray-600">
                {loadingPrices ? "Loading..." : `$${cryptoPrices?.bitcoin?.toLocaleString()}`}
              </div>
            </div>
          </button>
          
          <button
            onClick={() => setSelectedCrypto("monero")}
            className={`p-4 border rounded-lg flex items-center space-x-3 transition-colors ${
              selectedCrypto === "monero"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white font-bold">
              ɱ
            </div>
            <div className="text-left">
              <div className="font-semibold">Monero (XMR)</div>
              <div className="text-sm text-gray-600">
                {loadingPrices ? "Loading..." : `$${cryptoPrices?.monero?.toLocaleString()}`}
              </div>
            </div>
          </button>
        </div>
      </Card>
      
      {/* Plan Selection */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">2. Choose Your Plan</h3>
        {loadingPlans ? (
          <div className="text-center py-8">Loading plans...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`p-6 border rounded-lg transition-colors text-left ${
                  selectedPlan === plan.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className={`text-xl font-bold ${
                    plan.name.includes("Plus") ? "text-purple-600" : "text-blue-600"
                  }`}>
                    {plan.name}
                  </div>
                  {plan.popular && (
                    <div className="bg-pink-500 text-white text-xs px-2 py-1 rounded-full">
                      Popular
                    </div>
                  )}
                </div>
                <div className="text-gray-600 mb-2">{plan.description}</div>
                <div className="mb-4">
                  <span className="text-2xl font-bold text-gray-900">
                    ${plan.price}
                  </span>
                  <span className="text-gray-600">/{plan.interval}</span>
                  {plan.savings && (
                    <div className="text-green-600 text-sm font-medium">
                      Save ${plan.savings.savingsAmount} ({plan.savings.savingsPercentage}% off)
                    </div>
                  )}
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  {plan.features.slice(0, 4).map((feature, index) => (
                    <li key={index}>• {feature}</li>
                  ))}
                  {plan.features.length > 4 && (
                    <li className="text-gray-500">+ {plan.features.length - 4} more features</li>
                  )}
                </ul>
              </button>
            ))}
          </div>
        )}
      </Card>
      
      {/* Payment Summary */}
      <Card className="p-6 bg-gray-50">
        <h3 className="text-lg font-semibold mb-4">Payment Summary</h3>
        {loadingPlans ? (
          <div className="text-center py-4">Loading...</div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Plan:</span>
              <span className="font-semibold">
                {getSelectedPlan()?.name} ({getSelectedPlan()?.interval})
              </span>
            </div>
            <div className="flex justify-between">
              <span>Cryptocurrency:</span>
              <span className="font-semibold">
                {selectedCrypto === "bitcoin" ? "Bitcoin (BTC)" : "Monero (XMR)"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Amount (USD):</span>
              <span className="font-semibold">
                ${getSelectedPlan()?.price}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Amount ({getCryptoSymbol(selectedCrypto)}):</span>
              <span className="font-semibold">
                {loadingPrices || !cryptoPrices
                  ? "Calculating..."
                  : `${calculateCryptoAmount().toFixed(8)} ${getCryptoSymbol(selectedCrypto)}`
                }
              </span>
            </div>
            <hr className="my-4" />
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span>
                {loadingPrices || !cryptoPrices
                  ? "Calculating..."
                  : `${calculateCryptoAmount().toFixed(8)} ${getCryptoSymbol(selectedCrypto)}`
                }
              </span>
            </div>
          </div>
        )}
        
        <Button
          onClick={handleSubscribe}
          disabled={loading || loadingPrices || !cryptoPrices || loadingPlans}
          className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold"
        >
          {loading ? "Processing..." : "Continue to Payment"}
        </Button>
        
        <div className="mt-4 text-xs text-gray-500 text-center">
          By subscribing, you agree to our Terms of Service and Privacy Policy.
          Payments are processed securely on the blockchain.
        </div>
      </Card>
    </div>
  );
}