import React, { useState } from "react";
import { RefreshCw, Clock, Calendar, DollarSign } from "lucide-react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useNotification } from "@/contexts/NotificationContext";

interface RenewalPayment {
  paymentId: string;
  paymentReference: string;
  status: string;
  statusDisplay: string;
  cryptocurrency: string;
  planType: string;
  planDuration: string;
  amount: number;
  amountUSD: number;
  toAddress: string;
  expiresAt: string;
  createdAt: string;
}

interface SubscriptionRenewalProps {
  currentSubscription: {
    planType: string;
    planDuration: string;
    expiresAt: string;
    isActive: boolean;
  };
  onRenewalCreated: (renewalPayment: RenewalPayment) => void;
  onClose: () => void;
}

export default function SubscriptionRenewal({
  currentSubscription,
  onRenewalCreated,
  onClose,
}: SubscriptionRenewalProps) {
  const [renewing, setRenewing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState({
    type: currentSubscription.planType,
    duration: currentSubscription.planDuration,
  });
  const [selectedCrypto, setSelectedCrypto] = useState("bitcoin");
  const { showNotification } = useNotification();

  const planOptions = [
    {
      type: "premium",
      name: "Premium",
      features: ["Basic features", "Priority support"],
      durations: [
        { value: "1_month", label: "1 Month", btcPrice: 0.00025, xmrPrice: 0.15 },
        { value: "3_months", label: "3 Months", btcPrice: 0.0007, xmrPrice: 0.4 },
        { value: "6_months", label: "6 Months", btcPrice: 0.0013, xmrPrice: 0.75 },
        { value: "1_year", label: "1 Year", btcPrice: 0.0024, xmrPrice: 1.4 },
      ],
    },
    {
      type: "premium_plus",
      name: "Premium Plus",
      features: ["All Premium features", "Advanced matching", "Priority placement"],
      durations: [
        { value: "1_month", label: "1 Month", btcPrice: 0.0004, xmrPrice: 0.25 },
        { value: "3_months", label: "3 Months", btcPrice: 0.0011, xmrPrice: 0.65 },
        { value: "6_months", label: "6 Months", btcPrice: 0.002, xmrPrice: 1.2 },
        { value: "1_year", label: "1 Year", btcPrice: 0.0037, xmrPrice: 2.2 },
      ],
    },
  ];

  const handleRenewal = async () => {
    setRenewing(true);
    try {
      const token = localStorage.getItem("fiorell_auth_token");
      
      // Map duration format for API compatibility
      const apiPlanDuration = selectedPlan.duration === "1_year" ? "annual" : "monthly";
      
      const response = await fetch("/api/crypto/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planType: selectedPlan.type,
          planDuration: apiPlanDuration,
          cryptocurrency: selectedCrypto,
          paymentType: "renewal",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showNotification("Renewal payment created successfully!", "success");
        onRenewalCreated(data.payment);
      } else {
        throw new Error(data.error || "Failed to create renewal payment");
      }
    } catch (error) {
      console.error("Error creating renewal payment:", error);
      showNotification(
        error instanceof Error ? error.message : "Failed to create renewal payment",
        "error"
      );
    } finally {
      setRenewing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getCurrentPlanOption = () => {
    return planOptions.find(p => p.type === selectedPlan.type);
  };

  const getCurrentDuration = () => {
    const planOption = getCurrentPlanOption();
    return planOption?.durations.find(d => d.value === selectedPlan.duration);
  };

  const getPrice = () => {
    const duration = getCurrentDuration();
    if (!duration) return 0;
    return selectedCrypto === "bitcoin" ? duration.btcPrice : duration.xmrPrice;
  };

  const getCryptoSymbol = () => {
    return selectedCrypto === "bitcoin" ? "BTC" : "XMR";
  };

  const isExpiringSoon = () => {
    const expiryDate = new Date(currentSubscription.expiresAt);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 7;
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto bg-white shadow-xl">
      <div className="text-center mb-6">
        <Calendar className="w-12 h-12 text-blue-600 mx-auto mb-3" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Renew Subscription
        </h2>
        <p className="text-gray-600">
          Continue enjoying premium features with a new subscription
        </p>
      </div>

      {/* Current Subscription Info */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Current Subscription</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Plan:</span>
            <span>{currentSubscription.planType === "premium" ? "Premium" : "Premium Plus"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Duration:</span>
            <span>{currentSubscription.planDuration.replace("_", " ")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Expires:</span>
            <span className={isExpiringSoon() ? "text-orange-600 font-medium" : ""}>
              {formatDate(currentSubscription.expiresAt)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <span className={currentSubscription.isActive ? "text-green-600" : "text-red-600"}>
              {currentSubscription.isActive ? "Active" : "Expired"}
            </span>
          </div>
        </div>
      </div>

      {/* Plan Selection */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Renewal Plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {planOptions.map((plan) => (
            <div
              key={plan.type}
              onClick={() => setSelectedPlan(prev => ({ ...prev, type: plan.type }))}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                selectedPlan.type === plan.type
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <h4 className="font-semibold text-gray-900 mb-2">{plan.name}</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {plan.features.map((feature, index) => (
                  <li key={index}>• {feature}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Duration Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration
          </label>
          <select
            value={selectedPlan.duration}
            onChange={(e) => setSelectedPlan(prev => ({ ...prev, duration: e.target.value }))}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {getCurrentPlanOption()?.durations.map((duration) => (
              <option key={duration.value} value={duration.value}>
                {duration.label}
              </option>
            ))}
          </select>
        </div>

        {/* Cryptocurrency Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Method
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="bitcoin"
                checked={selectedCrypto === "bitcoin"}
                onChange={(e) => setSelectedCrypto(e.target.value)}
                className="mr-2"
              />
              Bitcoin (BTC)
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="monero"
                checked={selectedCrypto === "monero"}
                onChange={(e) => setSelectedCrypto(e.target.value)}
                className="mr-2"
              />
              Monero (XMR)
            </label>
          </div>
        </div>
      </div>

      {/* Price Summary */}
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-blue-800">Renewal Price:</span>
            <div className="font-semibold text-blue-900">
              {getPrice().toFixed(8)} {getCryptoSymbol()}
            </div>
          </div>
          <DollarSign className="w-8 h-8 text-blue-600" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <Button
          onClick={handleRenewal}
          disabled={renewing}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg"
        >
          {renewing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              Creating Renewal...
            </>
          ) : (
            <>
              <Calendar className="w-4 h-4 mr-2" />
              Create Renewal Payment
            </>
          )}
        </Button>
        <Button
          onClick={onClose}
          className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg"
          disabled={renewing}
        >
          Cancel
        </Button>
      </div>

      {/* Info */}
      <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
        <div className="flex items-start space-x-2">
          <Clock className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <strong>New Payment:</strong> This creates a fresh payment with a new reference.
            Your current subscription will be extended from its expiry date.
          </div>
        </div>
      </div>
    </Card>
  );
}