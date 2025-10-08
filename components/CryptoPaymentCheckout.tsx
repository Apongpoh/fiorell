import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface CryptoPaymentCheckoutProps {
  paymentData: {
    paymentId: string;
    cryptocurrency: string;
    amount: number;
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
  const [paymentStatus, setPaymentStatus] = useState<string>("pending");
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [confirmations, setConfirmations] = useState<number>(0);
  const [requiredConfirmations] = useState<number>(
    paymentData.cryptocurrency === "bitcoin" ? 1 : 10
  );
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  
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
    // Poll for payment status
    const checkPaymentStatus = async () => {
      try {
        const response = await fetch(`/api/crypto/webhook?paymentId=${paymentData.paymentId}`);
        if (response.ok) {
          const data = await response.json();
          setPaymentStatus(data.payment.status);
          setConfirmations(data.payment.confirmations || 0);
          
          if (data.payment.status === "confirmed") {
            onPaymentConfirmed();
          }
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
      }
    };
    
    const statusInterval = setInterval(checkPaymentStatus, 15000); // Check every 15 seconds
    
    return () => clearInterval(statusInterval);
  }, [paymentData.paymentId, onPaymentConfirmed]);
  
  const copyToClipboard = async (text: string, type: "address" | "amount") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "address") {
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
      } else {
        setCopiedAmount(true);
        setTimeout(() => setCopiedAmount(false), 2000);
      }
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-600";
      case "received":
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
        return "Waiting for payment...";
      case "received":
        return `Payment received! Waiting for ${requiredConfirmations} confirmation${requiredConfirmations > 1 ? "s" : ""}...`;
      case "confirmed":
        return "Payment confirmed! Subscription activated.";
      case "expired":
        return "Payment expired. Please try again.";
      case "failed":
        return "Payment failed. Please try again.";
      default:
        return "Processing...";
    }
  };
  
  const getCryptoSymbol = () => {
    return paymentData.cryptocurrency === "bitcoin" ? "BTC" : "XMR";
  };
  
  const generatePaymentURI = () => {
    if (paymentData.cryptocurrency === "bitcoin") {
      // Bitcoin URI format: bitcoin:address?amount=btc_amount&label=description
      return `bitcoin:${paymentData.paymentAddress}?amount=${paymentData.amount}&label=Fiorell%20Premium%20Subscription`;
    } else {
      // Monero URI format: monero:address?tx_amount=xmr_amount&tx_description=description
      return `monero:${paymentData.paymentAddress}?tx_amount=${paymentData.amount}&tx_description=Fiorell%20Premium%20Subscription`;
    }
  };
  
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
        </div>
        
        {/* Payment Status */}
        <div className="text-center mb-6">
          <div className={`text-lg font-semibold ${getStatusColor(paymentStatus)}`}>
            {getStatusMessage(paymentStatus)}
          </div>
          {paymentStatus === "received" && (
            <div className="text-sm text-gray-600 mt-1">
              Confirmations: {confirmations}/{requiredConfirmations}
            </div>
          )}
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
          <h3 className="font-semibold text-blue-900 mb-2">Payment Instructions:</h3>
          <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
            <li>Copy the exact amount and address above</li>
            <li>Open your {paymentData.cryptocurrency} wallet</li>
            <li>Send the exact amount to the provided address</li>
            <li>Wait for blockchain confirmations</li>
            <li>Your subscription will be activated automatically</li>
          </ol>
        </div>
        
        {/* Warning */}
        <div className="bg-yellow-50 p-4 rounded-lg mb-6">
          <div className="flex items-start space-x-2">
            <span className="text-yellow-600 text-xl">⚠️</span>
            <div className="text-sm text-yellow-800">
              <strong>Important:</strong> Send the exact amount shown above. Sending a different 
              amount may result in payment delays or loss of funds. This address is unique to 
              your order and expires in {timeRemaining}.
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex space-x-4">
          <Button
            onClick={() => {
              const uri = generatePaymentURI();
              console.log('Opening payment URI:', uri);
              
              // Try to open wallet app
              const opened = window.open(uri, "_blank");
              
              // If the window didn't open or closed immediately, show instructions
              setTimeout(() => {
                if (!opened || opened.closed) {
                  alert(`If your ${paymentData.cryptocurrency} wallet didn't open automatically:\n\n1. Copy the address and amount shown above\n2. Open your wallet app manually\n3. Create a new transaction with the copied details\n\nPayment URI: ${uri}`);
                }
              }, 500);
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg"
            disabled={paymentStatus === "expired"}
          >
            Open Wallet
          </Button>
          <Button
            onClick={onCancel}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg"
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