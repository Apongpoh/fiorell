import React, { useState } from "react";
import { RefreshCw, AlertCircle, Clock, XCircle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useNotification } from "@/contexts/NotificationContext";

interface PaymentData {
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

interface PaymentRetryProps {
  payment: PaymentData;
  onRetryCreated: (retryPayment: PaymentData) => void;
  onClose: () => void;
}

export default function PaymentRetry({
  payment,
  onRetryCreated,
  onClose,
}: PaymentRetryProps) {
  const [retrying, setRetrying] = useState(false);
  const [reason, setReason] = useState("");
  const { showNotification } = useNotification();

  const canRetry = ["failed", "expired"].includes(payment.status);
  
  const handleRetry = async () => {
    if (!canRetry) {
      showNotification("This payment cannot be retried", "error");
      return;
    }

    setRetrying(true);
    try {
      const token = localStorage.getItem("fiorell_auth_token");
      
      const response = await fetch("/api/crypto/retry-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentId: payment.paymentId,
          reason: reason.trim() || "User requested retry",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showNotification("New payment created successfully!", "success");
        onRetryCreated(data.retryPayment);
      } else {
        throw new Error(data.error || "Failed to create retry payment");
      }
    } catch (error) {
      console.error("Error retrying payment:", error);
      showNotification(
        error instanceof Error ? error.message : "Failed to retry payment",
        "error"
      );
    } finally {
      setRetrying(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "expired":
        return <Clock className="w-6 h-6 text-gray-500" />;
      case "failed":
        return <XCircle className="w-6 h-6 text-red-500" />;
      default:
        return <AlertCircle className="w-6 h-6 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "expired":
        return "text-gray-600";
      case "failed":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <Card className="p-6 max-w-lg mx-auto">
      <div className="text-center mb-6">
        {getStatusIcon(payment.status)}
        <h2 className="text-xl font-bold text-gray-900 mt-3 mb-2">
          Payment {payment.status === "expired" ? "Expired" : "Failed"}
        </h2>
        <p className="text-gray-600">
          Would you like to create a new payment for this subscription?
        </p>
      </div>

      {/* Payment Summary */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Payment Details</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Reference:</span>
            <span className="font-mono">{payment.paymentReference}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Plan:</span>
            <span>{payment.planType === "premium" ? "Premium" : "Premium Plus"} ({payment.planDuration})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Amount:</span>
            <span>${payment.amountUSD}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <span className={getStatusColor(payment.status)}>{payment.statusDisplay}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Created:</span>
            <span>{formatDate(payment.createdAt)}</span>
          </div>
          {payment.status === "expired" && (
            <div className="flex justify-between">
              <span className="text-gray-600">Expired:</span>
              <span className="text-red-600">{formatDate(payment.expiresAt)}</span>
            </div>
          )}
        </div>
      </div>

      {canRetry ? (
        <>
          {/* Retry Reason */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for retry (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Payment expired, want to try again..."
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <Button
              onClick={handleRetry}
              disabled={retrying}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg"
            >
              {retrying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Creating New Payment...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Create New Payment
                </>
              )}
            </Button>
            <Button
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg"
              disabled={retrying}
            >
              Cancel
            </Button>
          </div>

          {/* Info */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <strong>New Payment:</strong> This will create a fresh payment with a new reference.
                The original payment will remain in your history for record-keeping.
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="text-center p-4 bg-yellow-50 rounded-lg mb-6">
            <AlertCircle className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
            <p className="text-yellow-800">
              This payment cannot be retried. Please create a new payment instead.
            </p>
          </div>

          <Button
            onClick={onClose}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg"
          >
            Close
          </Button>
        </>
      )}
    </Card>
  );
}