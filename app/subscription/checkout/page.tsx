"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { 
  CreditCard, 
  Lock, 
  Check, 
  ArrowLeft, 
  Shield,
  Star,
  Crown,
  X,
  AlertTriangle
} from "lucide-react";
import Button from "@/components/ui/Button";

// Loading component for Suspense fallback
function CheckoutLoading() {
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
            <CreditCard className="h-8 w-8 text-white" />
          </motion.div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Checkout</h2>
        <p className="text-gray-600">Preparing your secure checkout...</p>
      </motion.div>
    </div>
  );
}

// Placeholder checkout page that simulates LemonSqueezy checkout
function PlaceholderCheckout() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<"payment" | "processing" | "failed" | "error">("payment");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [submissionAttempted, setSubmissionAttempted] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    cardNumber: "0000 0000 0000 0000",
    expiryMonth: "12",
    expiryYear: "2025",
    cvc: "123",
    cardholderName: "Your Name"
  });

  // Format card number as user types
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    const formattedValue = value.replace(/(\d{4})(?=\d)/g, '$1 '); // Add spaces every 4 digits
    setFormData(prev => ({ ...prev, cardNumber: formattedValue }));
    
    // Clear validation errors when user starts typing
    if (validationErrors.cardNumber) {
      setValidationErrors(prev => ({ ...prev, cardNumber: '' }));
    }
  };

  // Format expiry month to ensure it's 01-12
  const handleExpiryMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    
    // Allow empty value or values that could become valid (1, 01, 12, etc.)
    if (value === '') {
      setFormData(prev => ({ ...prev, expiryMonth: '' }));
    } else if (value.length === 1) {
      // Single digit: allow 0-9 (user might be typing 01, 02, etc.)
      if (parseInt(value) >= 0 && parseInt(value) <= 9) {
        setFormData(prev => ({ ...prev, expiryMonth: value }));
      }
    } else if (value.length === 2) {
      // Two digits: validate range 01-12
      const numValue = parseInt(value);
      if (numValue >= 1 && numValue <= 12) {
        setFormData(prev => ({ ...prev, expiryMonth: value }));
      }
    }
    
    // Clear validation errors when user starts typing
    if (validationErrors.expiryMonth) {
      setValidationErrors(prev => ({ ...prev, expiryMonth: '' }));
    }
  };

  // Ensure CVC is numeric only
  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    setFormData(prev => ({ ...prev, cvc: value }));
    
    // Clear validation errors when user starts typing
    if (validationErrors.cvc) {
      setValidationErrors(prev => ({ ...prev, cvc: '' }));
    }
  };

  // Detect card type based on card number
  const detectCardType = (cardNumber: string) => {
    const number = cardNumber.replace(/\s/g, '');
    
    // Visa: starts with 4
    if (/^4/.test(number)) return 'visa';
    
    // Mastercard: starts with 5 or 2221-2720
    if (/^5[1-5]/.test(number) || /^2[2-7]/.test(number)) return 'mastercard';
    
    // American Express: starts with 34 or 37
    if (/^3[47]/.test(number)) return 'amex';
    
    // Discover: starts with 6011, 622126-622925, 644-649, or 65
    if (/^6011/.test(number) || /^622[1-9]/.test(number) || /^64[4-9]/.test(number) || /^65/.test(number)) return 'discover';
    
    // Default to generic card
    return 'generic';
  };

  const cardType = detectCardType(formData.cardNumber);

  // Card type icon component
  const CardIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'visa':
        return (
          <Image 
            src="/card-logos/visa.svg" 
            alt="Visa" 
            width={48}
            height={24}
            className="h-6 w-auto"
          />
        );
      case 'mastercard':
        return (
          <Image 
            src="/card-logos/mastercard.svg" 
            alt="Mastercard" 
            width={48}
            height={24}
            className="h-6 w-auto"
          />
        );
      case 'amex':
        return (
          <Image 
            src="/card-logos/amex.svg" 
            alt="American Express" 
            width={48}
            height={24}
            className="h-6 w-auto"
          />
        );
      case 'discover':
        return (
          <Image 
            src="/card-logos/discover.svg" 
            alt="Discover" 
            width={48}
            height={24}
            className="h-6 w-auto"
          />
        );
      default:
        return (
          <Image 
            src="/card-logos/generic.svg" 
            alt="Credit Card" 
            width={48}
            height={24}
            className="h-6 w-auto"
          />
        );
    }
  };
  
  const planId = searchParams.get("plan");
  // const userId = searchParams.get("user"); // Not currently used in demo

  // Plan details for display
  const planDetails = {
    premium_monthly: {
      name: "Premium",
      price: 9.99,
      interval: "month",
      description: "Monthly Premium Subscription",
      savings: undefined
    },
    premium_annual: {
      name: "Premium",
      price: 99.99,
      interval: "year", 
      description: "Annual Premium Subscription",
      savings: "Save $19.89 (17% off)"
    },
    premium_plus_monthly: {
      name: "Premium Plus",
      price: 19.99,
      interval: "month",
      description: "Monthly Premium Plus Subscription",
      savings: undefined
    },
    premium_plus_annual: {
      name: "Premium Plus", 
      price: 199.99,
      interval: "year",
      description: "Annual Premium Plus Subscription",
      savings: "Save $39.89 (17% off)"
    }
  };

  const plan = planDetails[planId as keyof typeof planDetails];

  // Form validation function
  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    // Card number validation
    const cardNumber = formData.cardNumber.replace(/\s/g, '');
    if (!cardNumber) {
      errors.cardNumber = "Card number is required";
    } else if (cardNumber.length < 13 || cardNumber.length > 19) {
      errors.cardNumber = "Invalid card number length";
    }
    
    // Expiry validation
    if (!formData.expiryMonth) {
      errors.expiryMonth = "Expiry month is required";
    } else {
      const month = parseInt(formData.expiryMonth);
      if (month < 1 || month > 12) {
        errors.expiryMonth = "Invalid month (01-12)";
      }
    }
    
    if (!formData.expiryYear) {
      errors.expiryYear = "Expiry year is required";
    } else {
      const year = parseInt(formData.expiryYear);
      const currentYear = new Date().getFullYear();
      if (year < currentYear || year > currentYear + 20) {
        errors.expiryYear = "Invalid expiry year";
      }
    }
    
    // CVC validation
    if (!formData.cvc) {
      errors.cvc = "CVC is required";
    } else if (formData.cvc.length < 3 || formData.cvc.length > 4) {
      errors.cvc = "Invalid CVC (3-4 digits)";
    }
    
    // Cardholder name validation
    if (!formData.cardholderName.trim()) {
      errors.cardholderName = "Cardholder name is required";
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePayment = async () => {
    // Validate form first
    if (!validateForm()) {
      return;
    }

    // Prevent duplicate submissions
    if (submissionAttempted) {
      setErrorMessage("Payment is already being processed. Please wait or refresh the page.");
      setStep("error");
      return;
    }

    setSubmissionAttempted(true);
    setProcessing(true);
    setStep("processing");

    try {

      // Simulate payment processing delay, then show failure
      setTimeout(() => {
        setStep("failed");
        setProcessing(false);
      }, 3000);

    } catch (error) {
      setProcessing(false);
      setSubmissionAttempted(false); // Allow retry
      
      // Set custom error message based on error type
      let customErrorMessage = "We're having trouble processing your payment right now.";
      
      if (error instanceof Error) {
        if (error.message.includes('Payment session already processed')) {
          customErrorMessage = "This payment has already been processed. Please refresh the page to start a new checkout session.";
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          customErrorMessage = "Network connection issue. Please check your internet connection and try again.";
        } else if (error.message.includes('validation') || error.message.includes('Missing required')) {
          customErrorMessage = "Please check your payment details and try again.";
        } else if (error.message.includes('timeout')) {
          customErrorMessage = "Payment processing is taking longer than expected. Please try again.";
        } else if (error.message.includes('User not found')) {
          customErrorMessage = "Authentication error. Please log in again and try your purchase.";
        }
      }
      
      setErrorMessage(customErrorMessage);
      setStep("error");
    }
  };

  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Checkout Session</h1>
          <Button onClick={() => router.push("/subscription")} variant="outline">
            Back to Plans
          </Button>
        </div>
      </div>
    );
  }

  if (step === "processing") {
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
              <CreditCard className="h-8 w-8 text-white" />
            </motion.div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing Payment</h2>
          <p className="text-gray-600 mb-6">Please wait while we process your payment securely...</p>
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <Shield className="h-4 w-4" />
            <span>Secured by 256-bit SSL encryption</span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (step === "failed") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full mx-4"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <X className="h-8 w-8 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">We can&apos;t process your payment</h2>
          </div>

          {/* Body */}
          <div className="text-center space-y-4 mb-8">
            <p className="text-gray-700 leading-relaxed">
              We&apos;re having some trouble collecting your Fiorell Premium payment.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Please take a moment to review your payment details and double-check that there is money in your associated account.
            </p>
            <p className="text-gray-700 leading-relaxed">
              We&apos;ll try to process the payment again in a few days. If the problem persists, use another method or contact support.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={() => setStep("payment")}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-3 rounded-lg font-semibold"
            >
              Review Payment Details
            </Button>
            
            <Button
              onClick={() => router.push("/subscription")}
              variant="outline"
              className="w-full py-3 rounded-lg font-semibold"
            >
              Try Different Plan
            </Button>
            
            <Button
              onClick={() => router.push("/support")}
              variant="outline"
              className="w-full py-3 rounded-lg font-semibold text-gray-600 hover:text-gray-800"
            >
              Contact Support
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full mx-4"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <AlertTriangle className="h-8 w-8 text-white" />
            </motion.div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Error</h2>
          </div>

          {/* Error Message */}
          <div className="text-center space-y-4 mb-8">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium">
                {errorMessage}
              </p>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Don&apos;t worry - no payment has been charged. You can try again or contact our support team for assistance.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {errorMessage.includes('already been processed') ? (
              <Button
                onClick={() => window.location.reload()}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-3 rounded-lg font-semibold"
              >
                Refresh Page
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setStep("payment");
                  setErrorMessage("");
                  setSubmissionAttempted(false);
                  setValidationErrors({});
                }}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-3 rounded-lg font-semibold"
              >
                Try Again
              </Button>
            )}
            
            <Button
              onClick={() => router.push("/subscription")}
              variant="outline"
              className="w-full py-3 rounded-lg font-semibold"
            >
              Back to Plans
            </Button>
            
            <Button
              onClick={() => router.push("/support")}
              variant="outline"
              className="w-full py-3 rounded-lg font-semibold text-gray-600 hover:text-gray-800"
            >
              Contact Support
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Complete Your Purchase</h1>
              <p className="text-sm text-gray-500">Secure checkout powered by Fiorell</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Summary</h2>
            
            <div className="border border-gray-200 rounded-xl p-4 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    {plan.name === "Premium Plus" ? (
                      <Crown className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <Star className="h-5 w-5 text-pink-500" />
                    )}
                    {plan.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
                  {plan.savings && (
                    <p className="text-sm text-green-600 font-medium mt-1">{plan.savings}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">${plan.price}</p>
                  <p className="text-sm text-gray-500">per {plan.interval}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">${plan.price}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span className="text-gray-900">$0.00</span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-bold text-xl text-gray-900">${plan.price}</span>
                </div>
              </div>
            </div>

            {/* Features Preview */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3">What you&apos;ll get:</h4>
              <div className="space-y-2">
                {plan.name === "Premium Plus" ? (
                  <>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Unlimited likes & super likes</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Travel mode & incognito mode</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Message before matching</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>See who liked you</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Unlimited likes</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>See who liked you</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Advanced filters</span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Check className="h-4 w-4 text-green-500" />
                      <span>Ad-free experience</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Payment Information</h2>
            
            {/* Demo Payment Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Card Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="4242 4242 4242 4242"
                    className={`w-full px-4 py-3 pr-20 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                      validationErrors.cardNumber ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    value={formData.cardNumber}
                    onChange={handleCardNumberChange}
                    maxLength={19}
                  />
                  <div className="absolute right-3 top-3">
                    <CardIcon type={cardType} />
                  </div>
                </div>
                {validationErrors.cardNumber ? (
                  <p className="text-xs text-red-600 mt-1 flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {validationErrors.cardNumber}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">
                    {cardType !== 'generic' ? (
                      <span>
                        {cardType === 'visa' && 'Visa card detected'}
                        {cardType === 'mastercard' && 'Mastercard detected'}
                        {cardType === 'amex' && 'American Express detected'}
                        {cardType === 'discover' && 'Discover card detected'}
                        {' • '}
                      </span>
                    ) : null}
                    Card number
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Month
                  </label>
                  <input
                    type="text"
                    placeholder="12"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                      validationErrors.expiryMonth ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    value={formData.expiryMonth}
                    onChange={handleExpiryMonthChange}
                    maxLength={2}
                  />
                  {validationErrors.expiryMonth && (
                    <p className="text-xs text-red-600 mt-1 flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {validationErrors.expiryMonth}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Year
                  </label>
                  <input
                    type="text"
                    placeholder="2025"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                      validationErrors.expiryYear ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    value={formData.expiryYear}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, expiryYear: e.target.value }));
                      // Clear validation errors when user starts typing
                      if (validationErrors.expiryYear) {
                        setValidationErrors(prev => ({ ...prev, expiryYear: '' }));
                      }
                    }}
                    maxLength={4}
                  />
                  {validationErrors.expiryYear && (
                    <p className="text-xs text-red-600 mt-1 flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {validationErrors.expiryYear}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CVC
                  </label>
                  <input
                    type="text"
                    placeholder="123"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                      validationErrors.cvc ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    value={formData.cvc}
                    onChange={handleCvcChange}
                    maxLength={4}
                  />
                  {validationErrors.cvc && (
                    <p className="text-xs text-red-600 mt-1 flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {validationErrors.cvc}
                    </p>
                  )}
                </div>
                <div></div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent ${
                    validationErrors.cardholderName ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  value={formData.cardholderName}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, cardholderName: e.target.value }));
                    // Clear validation errors when user starts typing
                    if (validationErrors.cardholderName) {
                      setValidationErrors(prev => ({ ...prev, cardholderName: '' }));
                    }
                  }}
                />
                {validationErrors.cardholderName && (
                  <p className="text-xs text-red-600 mt-1 flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {validationErrors.cardholderName}
                  </p>
                )}
              </div>
            </div>

            {/* Accepted Cards */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-3">We accept</h4>
              <div className="flex items-center space-x-4">
                <Image 
                  src="/card-logos/visa.svg" 
                  alt="Visa" 
                  width={48}
                  height={32}
                  className="h-8 w-auto"
                />
                <Image 
                  src="/card-logos/mastercard.svg" 
                  alt="Mastercard" 
                  width={48}
                  height={32}
                  className="h-8 w-auto"
                />
                <Image 
                  src="/card-logos/amex.svg" 
                  alt="American Express" 
                  width={48}
                  height={32}
                  className="h-8 w-auto"
                />
                <Image 
                  src="/card-logos/discover.svg" 
                  alt="Discover" 
                  width={48}
                  height={32}
                  className="h-8 w-auto"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                All major credit and debit cards accepted
              </p>
            </div>

            {/* Security Notice */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Shield className="h-4 w-4" />
                <span>Your payment information is secure and encrypted</span>
              </div>
            </div>

            {/* Complete Payment Button */}
            <Button
              onClick={handlePayment}
              disabled={processing}
              className="w-full mt-6 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-3 rounded-lg font-semibold"
            >
              {processing ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Lock className="h-4 w-4" />
                  <span>Complete Payment - ${plan.price}</span>
                </div>
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center mt-4">
              By completing this purchase, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrapper component with Suspense boundary
export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutLoading />}>
      <PlaceholderCheckout />
    </Suspense>
  );
}