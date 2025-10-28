import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PaymentProofSubmission from "@/components/PaymentProofSubmission";

interface CryptoPaymentCheckoutProps {
  paymentData: {
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
  };
  onPaymentConfirmed: () => void;
  onCancel: () => void;
}

export default function CryptoPaymentCheckout({
  paymentData,
  onPaymentConfirmed,
  onCancel,
}: CryptoPaymentCheckoutProps) {
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "user_confirmed" | "admin_verifying" | "confirmed" | "failed" | "expired">("pending");
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedReference, setCopiedReference] = useState(false);
  const [showProofSubmission, setShowProofSubmission] = useState(false);
  const [paymentMade, setPaymentMade] = useState(false);
  
  useEffect(() => {
    // Update countdown timer
    const updateTimer = () => {
      const now = new Date().getTime();
      const expiry = new Date(paymentData.expiresAt).getTime();
      const distance = expiry - now;
      
      if (distance > 0) {
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        setTimeRemaining(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
      } else {
        setTimeRemaining("EXPIRED");
        setPaymentStatus("expired");
      }
    };
    
    const timer = setInterval(updateTimer, 1000);
    updateTimer();
    
    return () => clearInterval(timer);
  }, [paymentData.expiresAt]);
  
  useEffect(() => {
    // Poll for payment status using the new API
    const checkPaymentStatus = async () => {
      if (!paymentData.paymentReference) return;
      
      try {
        const token = localStorage.getItem("fiorell_auth_token");
        const response = await fetch(`/api/crypto/confirm-payment?reference=${paymentData.paymentReference}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setPaymentStatus(data.payment.status);
          
          if (data.payment.status === "confirmed") {
            onPaymentConfirmed();
          }
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
      }
    };
    
    const statusInterval = setInterval(checkPaymentStatus, 30000); // Check every 30 seconds
    
    return () => clearInterval(statusInterval);
  }, [paymentData.paymentReference, onPaymentConfirmed]);
  
  const copyToClipboard = async (text: string, type: "address" | "amount" | "reference") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "address") {
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      } else if (type === "amount") {
        setCopiedAmount(true);
        setTimeout(() => setCopiedAmount(false), 2000);
      } else if (type === "reference") {
        setCopiedReference(true);
        setTimeout(() => setCopiedReference(false), 2000);
      }
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-600";
      case "user_confirmed":
        return "text-blue-600";
      case "admin_verifying":
        return "text-blue-600";
      case "confirmed":
        return "text-green-600";
      case "expired":
      case "failed":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };
  
  const getStatusMessage = (status: string) => {
    switch (status) {
      case "pending":
        return paymentMade 
          ? "Waiting for you to submit payment proof..." 
          : "Send payment and then submit proof below...";
      case "user_confirmed":
        return "Payment proof submitted! Admin reviewing within 24 hours...";
      case "admin_verifying":
        return "Admin is verifying your payment proof...";
      case "confirmed":
        return "Payment confirmed! Subscription activated.";
      case "expired":
        return "Payment expired. Please try again.";
      case "failed":
        return "Payment verification failed. Please contact support.";
      default:
        return "Processing...";
    }
  };
  
  const getCryptoSymbol = () => {
    return paymentData.cryptocurrency === "bitcoin" ? "BTC" : "XMR";
  };
  
  // Show proof submission component if user chooses to submit proof
  if (showProofSubmission && paymentData.paymentReference) {
    return (
      <PaymentProofSubmission
        paymentData={{
          paymentId: paymentData.paymentId,
          paymentReference: paymentData.paymentReference,
          cryptocurrency: paymentData.cryptocurrency,
          amount: paymentData.amount,
          amountSat: paymentData.amountSat,
          expectedAmountSat: paymentData.expectedAmountSat,
          paymentAddress: paymentData.paymentAddress,
          planType: paymentData.planType,
          amountUSD: paymentData.amountUSD,
        }}
        onProofSubmitted={() => {
          setShowProofSubmission(false);
          setPaymentStatus("user_confirmed");
          onPaymentConfirmed();
        }}
        onBack={() => setShowProofSubmission(false)}
      />
    );
  }
  
  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Complete Your {paymentData.cryptocurrency === "bitcoin" ? "Bitcoin" : "Monero"} Payment
          </h2>
          <p className="text-gray-600">
            {paymentData.planType === "premium" ? "Premium" : "Premium Plus"} Subscription
          </p>
          {paymentData.paymentReference && (
            <div className="mt-2 p-2 bg-blue-100 rounded-lg">
              <span className="text-sm text-blue-800">
                Payment Reference: <strong>{paymentData.paymentReference}</strong>
              </span>
            </div>
          )}
        </div>
        
        {/* Payment Status */}
        <div className="text-center mb-6">
          <div className={`text-lg font-semibold ${getStatusColor(paymentStatus)}`}>
            {getStatusMessage(paymentStatus)}
          </div>
          <div className="text-sm text-gray-500 mt-2">
            Payment expires in: <span className="font-mono text-red-600">{timeRemaining}</span>
          </div>
        </div>
        
        {/* QR Code */}
        <div className="text-center mb-6">
          <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
            {paymentData.qrCode ? (
              <Image
                src={paymentData.qrCode}
                alt="Payment QR Code"
                width={192}
                height={192}
                className="mx-auto"
                priority
              />
            ) : (
              <div className="w-48 h-48 bg-gray-100 flex items-center justify-center rounded-lg">
                <div className="text-center">
                  <div className="text-4xl mb-2">
                    {paymentData.cryptocurrency === "bitcoin" ? "₿" : "ɱ"}
                  </div>
                  <div className="text-sm text-gray-600">QR Code</div>
                </div>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Scan with your {paymentData.cryptocurrency} wallet
          </p>
        </div>
        
        {/* Payment Reference */}
        {paymentData.paymentReference && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Reference (for tracking):
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={paymentData.paymentReference}
                readOnly
                className="flex-1 p-3 border border-gray-300 rounded-lg bg-blue-50 font-mono text-center font-bold"
              />
              <Button
                onClick={() => copyToClipboard(paymentData.paymentReference!, "reference")}
                className="px-4 py-3 bg-blue-200 hover:bg-blue-300 text-blue-700 rounded-lg"
              >
                {copiedReference ? "Copied!" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Keep this reference for tracking your payment
            </p>
          </div>
        )}

        {/* Payment Details */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Send exactly this amount:
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={`${paymentData.amount.toFixed(8)} ${getCryptoSymbol()}`}
                readOnly
                className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-50 font-mono text-center"
              />
              <Button
                onClick={() => copyToClipboard(paymentData.amount.toString(), "amount")}
                className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg"
              >
                {copiedAmount ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To this address:
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={paymentData.paymentAddress}
                readOnly
                className="flex-1 p-3 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
              />
              <Button
                onClick={() => copyToClipboard(paymentData.paymentAddress, "address")}
                className="px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg"
              >
                {copiedAddress ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Payment Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">New Payment Process:</h3>
          <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
            <li>Copy the exact amount and address above</li>
            <li>Copy and save your payment reference: <strong>{paymentData.paymentReference}</strong></li>
            <li>Send the exact amount to the provided address</li>
            <li>After sending, click &quot;I&apos;ve Made the Payment&quot; below</li>
            <li>Submit your transaction hash for verification</li>
            <li>Admin will verify and activate your subscription within 24 hours</li>
          </ol>
        </div>
        
        {/* Warning */}
        <div className="bg-yellow-50 p-4 rounded-lg mb-6">
          <div className="flex items-start space-x-2">
            <span className="text-yellow-600 text-xl">⚠️</span>
            <div className="text-sm text-yellow-800">
              <strong>Important:</strong> Send the exact amount shown above to the address. 
              After sending, you&apos;ll need to submit proof of payment (transaction hash) for verification. 
              Keep your payment reference <strong>{paymentData.paymentReference}</strong> for tracking.
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="space-y-4">
          {/* Primary action based on payment status */}
          {paymentStatus === "pending" && !paymentMade && (
            <Button
              onClick={() => setPaymentMade(true)}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg"
            >
              I&apos;ve Made the Payment
            </Button>
          )}

          {(paymentMade || paymentStatus === "pending") && paymentMade && (
            <Button
              onClick={() => setShowProofSubmission(true)}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg"
            >
              Submit Payment Proof
            </Button>
          )}

          {paymentStatus === "user_confirmed" && (
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-blue-800 font-medium">
                Payment proof submitted! We&apos;ll verify within 24 hours.
              </p>
            </div>
          )}

          {(paymentStatus === "admin_verifying" || paymentStatus === "confirmed") && (
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-green-800 font-medium">
                {paymentStatus === "confirmed" 
                  ? "Payment confirmed! Your subscription is now active." 
                  : "Admin is verifying your payment..."}
              </p>
            </div>
          )}

          {paymentStatus === "expired" && (
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-red-800 font-medium">
                Payment has expired. Please start a new payment.
              </p>
            </div>
          )}

          {paymentStatus === "failed" && (
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-red-800 font-medium">
                Payment verification failed. Please contact support or try again.
              </p>
            </div>
          )}

          {/* Cancel button */}
          <Button
            onClick={onCancel}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg"
          >
            Cancel Payment
          </Button>
        </div>
        
        {/* Support */}
        <div className="text-center mt-6 text-sm text-gray-500">
          Having trouble? <a href="/support" className="text-blue-600 hover:underline">Contact Support</a>
        </div>
      </Card>
    </div>
  );
}