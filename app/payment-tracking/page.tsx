"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  ExternalLink,
  RefreshCw,
  Copy,
  ArrowLeft,
} from "lucide-react";
import { useNotification } from "@/contexts/NotificationContext";
import PaymentRetry from "@/components/PaymentRetry";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useRouter } from "next/navigation";

interface PaymentStatus {
  paymentId: string;
  paymentReference: string;
  cryptocurrency: string;
  amount: number;
  amountUSD: number;
  expectedAmountSat?: number;
  toAddress: string;
  status: string;
  statusDisplay: string;
  planType: string;
  planDuration: string;
  expiresAt: string;
  userProof?: {
    transactionHash: string;
    amount: number;
    submittedAt: string;
    notes?: string;
  };
  adminVerification?: {
    status: "approved" | "rejected";
    verifiedAt: string;
    notes?: string;
  };
  createdAt: string;
  userConfirmedAt?: string;
  adminVerifiedAt?: string;
  confirmedAt?: string;
}

export default function PaymentTrackingPage() {
  const [paymentReference, setPaymentReference] = useState("");
  const [payment, setPayment] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [, setCopied] = useState(false);
  const [showRetryModal, setShowRetryModal] = useState(false);

  const { showNotification } = useNotification();
  const router = useRouter();

  const checkPaymentStatus = useCallback(
    async (reference: string) => {
      if (!reference.trim()) {
        showNotification("Please enter a payment reference", "error");
        return;
      }

      setLoading(true);
      try {
        const token = localStorage.getItem("fiorell_auth_token");
        const response = await fetch(
          `/api/crypto/confirm-payment?reference=${encodeURIComponent(reference)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setPayment(data.payment);
        } else {
          const error = await response.json();
          throw new Error(error.error || "Payment not found");
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
        showNotification(
          error instanceof Error ? error.message : "Failed to check payment status",
          "error"
        );
        setPayment(null);
      } finally {
        setLoading(false);
      }
    },
    [showNotification]
  );

  useEffect(() => {
    // Check if payment reference is in URL params (from redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get("ref");
    if (ref) {
      setPaymentReference(ref);
      checkPaymentStatus(ref);
    }
  }, [checkPaymentStatus]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showNotification("Copied to clipboard", "success");
    } catch (error) {
      console.error("Failed to copy:", error);
      showNotification("Failed to copy", "error");
    }
  };

  const openBlockchainExplorer = (txHash: string, cryptocurrency: string) => {
    const baseUrl = cryptocurrency === "bitcoin" 
      ? "https://blockstream.info/tx/" 
      : "https://xmrchain.net/tx/";
    window.open(`${baseUrl}${txHash}`, "_blank");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCrypto = (amount: number, cryptocurrency: string) => {
    const symbol = cryptocurrency === "bitcoin" ? "BTC" : "XMR";
    return `${amount.toFixed(8)} ${symbol}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "user_confirmed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "admin_verifying":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "confirmed":
        return "bg-green-100 text-green-800 border-green-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      case "expired":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const handleRetryCreated = (retryPayment: PaymentStatus) => {
    setShowRetryModal(false);
    setPaymentReference(retryPayment.paymentReference);
    setPayment(retryPayment);
    showNotification("New payment created! You can now make the payment.", "success");
  };

  const canRetryPayment = (payment: PaymentStatus) => {
    return ["failed", "expired"].includes(payment.status);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5" />;
      case "user_confirmed":
        return <Clock className="w-5 h-5" />;
      case "admin_verifying":
        return <RefreshCw className="w-5 h-5" />;
      case "confirmed":
        return <CheckCircle className="w-5 h-5" />;
      case "failed":
      case "expired":
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getProgressSteps = (status: string) => {
    const steps = [
      { key: "created", label: "Payment Created", completed: true },
      { key: "submitted", label: "Proof Submitted", completed: ["user_confirmed", "admin_verifying", "confirmed"].includes(status) },
      { key: "verifying", label: "Admin Verifying", completed: ["admin_verifying", "confirmed"].includes(status) },
      { key: "confirmed", label: "Payment Confirmed", completed: status === "confirmed" },
    ];

    if (status === "failed") {
      return [
        ...steps.slice(0, -1),
        { key: "failed", label: "Payment Rejected", completed: true },
      ];
    }

    if (status === "expired") {
      return [
        { key: "created", label: "Payment Created", completed: true },
        { key: "expired", label: "Payment Expired", completed: true },
      ];
    }

    return steps;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Button
              onClick={() => router.back()}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Track Your Payment
              </h1>
              <p className="text-gray-600">
                Check the status of your cryptocurrency payment verification
              </p>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <Card className="p-6 mb-8">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Reference
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Enter your payment reference (e.g., PAY_ABC123_XYZ789)"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                  onKeyPress={(e) => e.key === "Enter" && checkPaymentStatus(paymentReference)}
                />
              </div>
            </div>
            <div className="sm:pt-7">
              <Button
                onClick={() => checkPaymentStatus(paymentReference)}
                disabled={loading || !paymentReference.trim()}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-3"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Check Status
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="mt-4 text-sm text-gray-500">
            <p>
              Your payment reference was provided when you created the payment. 
              Check your email or the payment page for this reference.
            </p>
          </div>
        </Card>

        {/* Payment Status */}
        {payment && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Status Overview */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(payment.status)}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Payment Status
                    </h2>
                    <p className="text-gray-600">Reference: {payment.paymentReference}</p>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-lg border ${getStatusColor(payment.status)}`}>
                  <span className="font-medium">{payment.statusDisplay}</span>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress</h3>
                <div className="flex items-center space-x-4 overflow-x-auto">
                  {getProgressSteps(payment.status).map((step, index, array) => (
                    <div key={step.key} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          step.completed 
                            ? "bg-green-500 text-white" 
                            : "bg-gray-200 text-gray-500"
                        }`}>
                          {step.completed ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            <Clock className="w-5 h-5" />
                          )}
                        </div>
                        <span className={`text-xs mt-2 text-center ${
                          step.completed ? "text-green-600" : "text-gray-500"
                        }`}>
                          {step.label}
                        </span>
                      </div>
                      {index < array.length - 1 && (
                        <div className={`w-16 h-0.5 mx-2 ${
                          step.completed ? "bg-green-500" : "bg-gray-200"
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Plan</span>
                    <p className="text-lg font-semibold text-gray-900">
                      {payment.planType === "premium" ? "Premium" : "Premium Plus"} ({payment.planDuration})
                    </p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-500">Amount</span>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatCrypto(payment.amount, payment.cryptocurrency)}
                    </p>
                    <p className="text-sm text-gray-600">${payment.amountUSD} USD</p>
                  </div>

                  <div>
                    <span className="text-sm font-medium text-gray-500">Payment Address</span>
                    <div className="flex items-center space-x-2">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">
                        {payment.toAddress}
                      </code>
                      <button
                        onClick={() => copyToClipboard(payment.toAddress)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Created</span>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatDate(payment.createdAt)}
                    </p>
                  </div>

                  {payment.userConfirmedAt && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Proof Submitted</span>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatDate(payment.userConfirmedAt)}
                      </p>
                    </div>
                  )}

                  {payment.confirmedAt && (
                    <div>
                      <span className="text-sm font-medium text-gray-500">Confirmed</span>
                      <p className="text-lg font-semibold text-green-600">
                        {formatDate(payment.confirmedAt)}
                      </p>
                    </div>
                  )}

                  <div>
                    <span className="text-sm font-medium text-gray-500">Expires</span>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatDate(payment.expiresAt)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* User Proof Section */}
            {payment.userProof && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Payment Proof</h3>
                <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900">Transaction Hash:</span>
                    <div className="flex items-center space-x-2">
                      <code className="text-sm bg-white px-2 py-1 rounded border">
                        {payment.userProof.transactionHash}
                      </code>
                      <button
                        onClick={() => openBlockchainExplorer(payment.userProof!.transactionHash, payment.cryptocurrency)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900">Reported Amount:</span>
                    <span className="text-sm font-mono">
                      {formatCrypto(payment.userProof.amount, payment.cryptocurrency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900">Submitted:</span>
                    <span className="text-sm">
                      {formatDate(payment.userProof.submittedAt)}
                    </span>
                  </div>

                  {payment.userProof.notes && (
                    <div>
                      <span className="text-sm font-medium text-blue-900">Your Notes:</span>
                      <p className="text-sm text-blue-800 mt-1">{payment.userProof.notes}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Admin Verification Section */}
            {payment.adminVerification && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Admin Verification</h3>
                <div className={`p-4 rounded-lg space-y-3 ${
                  payment.adminVerification.status === "approved"
                    ? "bg-green-50"
                    : "bg-red-50"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">Status:</span>
                    <span className={`text-sm font-semibold ${
                      payment.adminVerification.status === "approved"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}>
                      {payment.adminVerification.status.charAt(0).toUpperCase() + payment.adminVerification.status.slice(1)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">Verified:</span>
                    <span className="text-sm">
                      {formatDate(payment.adminVerification.verifiedAt)}
                    </span>
                  </div>

                  {payment.adminVerification.notes && (
                    <div>
                      <span className="text-sm font-medium text-gray-900">Admin Notes:</span>
                      <p className={`text-sm mt-1 ${
                        payment.adminVerification.status === "approved"
                          ? "text-green-800"
                          : "text-red-800"
                      }`}>
                        {payment.adminVerification.notes}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Action Buttons */}
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Button
                  onClick={() => checkPaymentStatus(payment.paymentReference)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Status
                </Button>

                {payment.status === "pending" && (
                  <Button
                    onClick={() => router.push(`/subscription/crypto?payment=${payment.paymentReference}`)}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Submit Payment Proof
                  </Button>
                )}

                {canRetryPayment(payment) && (
                  <Button
                    onClick={() => setShowRetryModal(true)}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry Payment
                  </Button>
                )}

                <Button
                  onClick={() => router.push("/support")}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700"
                >
                  Contact Support
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Help Section */}
        {!payment && !loading && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Need Help?</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                • Your payment reference is provided when you create a cryptocurrency payment
              </p>
              <p>
                • The reference format is PAY_XXXXXX_XXXXXX (e.g., PAY_ABC123_XYZ789)
              </p>
              <p>
                • If you can&apos;t find your reference, check your email or contact support
              </p>
              <p>
                • Payment verification typically takes up to 24 hours after proof submission
              </p>
            </div>

            <div className="mt-6">
              <Button
                onClick={() => router.push("/support")}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Contact Support
              </Button>
            </div>
          </Card>
        )}

        {/* Retry Modal */}
        {showRetryModal && payment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <PaymentRetry
              payment={payment}
              onRetryCreated={handleRetryCreated}
              onClose={() => setShowRetryModal(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}