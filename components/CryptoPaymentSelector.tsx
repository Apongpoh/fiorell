import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface CryptoPaymentSelectorProps {
  onPlanSelect: (plan: {
    cryptocurrency: string;
    planType: string;
    billingCycle: string;
    amountCrypto: number;
    amountUSD: number;
  }) => void;
  loading?: boolean;
}

interface PricingData {
  bitcoin: number;
  monero: number;
}

export default function CryptoPaymentSelector({
  onPlanSelect,
  loading = false,
}: CryptoPaymentSelectorProps) {
  const [selectedCrypto, setSelectedCrypto] = useState<"bitcoin" | "monero">("bitcoin");
  const [selectedPlan, setSelectedPlan] = useState<"premium" | "premium_plus">("premium");
  const [selectedBilling, setSelectedBilling] = useState<"monthly" | "annual">("monthly");
  const [cryptoPrices, setCryptoPrices] = useState<PricingData | null>(null);
  const [loadingPrices, setLoadingPrices] = useState(true);
  
  const planPricing = {
    premium: {
      monthly: 9.99,
      annual: 99.99,
    },
    premium_plus: {
      monthly: 19.99,
      annual: 199.99,
    },
  };
  
  useEffect(() => {
    fetchCryptoPrices();
  }, []);
  
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
  
  const calculateCryptoAmount = () => {
    if (!cryptoPrices) return 0;
    
    const usdAmount = planPricing[selectedPlan][selectedBilling];
    const cryptoPrice = cryptoPrices[selectedCrypto];
    
    return usdAmount / cryptoPrice;
  };
  
  const handleSubscribe = () => {
    console.log("handleSubscribe called");
    console.log("selectedCrypto:", selectedCrypto);
    console.log("selectedPlan:", selectedPlan);
    console.log("selectedBilling:", selectedBilling);
    console.log("cryptoPrices:", cryptoPrices);
    
    const usdAmount = planPricing[selectedPlan][selectedBilling];
    const cryptoAmount = calculateCryptoAmount();
    
    console.log("usdAmount:", usdAmount);
    console.log("cryptoAmount:", cryptoAmount);
    
    onPlanSelect({
      cryptocurrency: selectedCrypto,
      planType: selectedPlan,
      billingCycle: selectedBilling,
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
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setSelectedPlan("premium")}
            className={`p-6 border rounded-lg transition-colors ${
              selectedPlan === "premium"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <div className="text-xl font-bold text-blue-600 mb-2">Premium</div>
            <div className="text-gray-600 mb-4">
              Essential features for dating success
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Unlimited likes</li>
              <li>• See who liked you</li>
              <li>• Advanced filters</li>
              <li>• Priority support</li>
            </ul>
          </button>
          
          <button
            onClick={() => setSelectedPlan("premium_plus")}
            className={`p-6 border rounded-lg transition-colors ${
              selectedPlan === "premium_plus"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <div className="text-xl font-bold text-purple-600 mb-2">Premium Plus</div>
            <div className="text-gray-600 mb-4">
              Maximum privacy and exclusive features
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Everything in Premium</li>
              <li>• Disappearing messages</li>
              <li>• Enhanced privacy mode</li>
              <li>• Exclusive events access</li>
            </ul>
          </button>
        </div>
      </Card>
      
      {/* Billing Cycle Selection */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">3. Select Billing Cycle</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setSelectedBilling("monthly")}
            className={`p-4 border rounded-lg transition-colors ${
              selectedBilling === "monthly"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <div className="font-semibold">Monthly</div>
            <div className="text-2xl font-bold text-gray-900">
              ${planPricing[selectedPlan].monthly}
            </div>
            <div className="text-sm text-gray-600">per month</div>
          </button>
          
          <button
            onClick={() => setSelectedBilling("annual")}
            className={`p-4 border rounded-lg transition-colors relative ${
              selectedBilling === "annual"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
          >
            <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
              Save 17%
            </div>
            <div className="font-semibold">Annual</div>
            <div className="text-2xl font-bold text-gray-900">
              ${planPricing[selectedPlan].annual}
            </div>
            <div className="text-sm text-gray-600">per year</div>
          </button>
        </div>
      </Card>
      
      {/* Payment Summary */}
      <Card className="p-6 bg-gray-50">
        <h3 className="text-lg font-semibold mb-4">Payment Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span>Plan:</span>
            <span className="font-semibold">
              {selectedPlan === "premium" ? "Premium" : "Premium Plus"} ({selectedBilling})
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
              ${planPricing[selectedPlan][selectedBilling]}
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
        
        <Button
          onClick={handleSubscribe}
          disabled={loading || loadingPrices || !cryptoPrices}
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