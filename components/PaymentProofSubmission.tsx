import React, { useState } from "react";
import { Upload, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { useNotification } from "@/contexts/NotificationContext";

interface PaymentProofSubmissionProps {
  paymentData: {
    paymentId: string;
    paymentReference: string;
    cryptocurrency: string;
    amount: number;
    amountSat?: number;
    expectedAmountSat?: number;
    paymentAddress: string;
    planType: string;
    amountUSD: number;
  };
  onProofSubmitted: () => void;
  onBack: () => void;
}

interface ProofForm {
  transactionHash: string;
  fromAddress: string;
  amount: string;
  screenshot: string;
  notes: string;
}

export default function PaymentProofSubmission({
  paymentData,
  onProofSubmitted,
  onBack,
}: PaymentProofSubmissionProps) {
  const [form, setForm] = useState<ProofForm>({
    transactionHash: "",
    fromAddress: "",
    amount: paymentData.amountSat ? (paymentData.amountSat / 100000000).toString() : paymentData.amount.toString(),
    screenshot: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { showNotification } = useNotification();

  const handleInputChange = (field: keyof ProofForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      showNotification("Please upload an image file", "error");
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      showNotification("File size must be less than 5MB", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setForm(prev => ({ ...prev, screenshot: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleDragEvents = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    handleDragEvents(e);
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    handleDragEvents(e);
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    handleDragEvents(e);
    setDragActive(false);
    
    const files = e.dataTransfer?.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  };

  const validateForm = (): string | null => {
    if (!form.transactionHash.trim()) {
      return "Transaction hash is required";
    }

    // Basic transaction hash validation (64 hex characters)
    if (!/^[a-fA-F0-9]{64}$/.test(form.transactionHash.trim())) {
      return "Transaction hash must be 64 hexadecimal characters";
    }

    if (!form.amount.trim()) {
      return "Transaction amount is required";
    }

    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      return "Please enter a valid transaction amount";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      showNotification(validationError, "error");
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem("fiorell_auth_token");
      
      const response = await fetch("/api/crypto/confirm-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentReference: paymentData.paymentReference,
          transactionHash: form.transactionHash.trim(),
          fromAddress: form.fromAddress.trim() || undefined,
          amount: parseFloat(form.amount),
          screenshot: form.screenshot || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showNotification("Payment proof submitted successfully! Admin will verify within 24 hours.", "success");
        onProofSubmitted();
      } else {
        throw new Error(data.error || "Failed to submit payment proof");
      }
    } catch (error) {
      console.error("Error submitting proof:", error);
      showNotification(
        error instanceof Error ? error.message : "Failed to submit payment proof",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getCryptoSymbol = () => {
    return paymentData.cryptocurrency === "bitcoin" ? "BTC" : "XMR";
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card className="p-8">
        <div className="text-center mb-6">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Submit Payment Proof
          </h2>
          <p className="text-gray-600">
            Confirm your {paymentData.cryptocurrency === "bitcoin" ? "Bitcoin" : "Monero"} payment to activate your subscription
          </p>
        </div>

        {/* Payment Summary */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">Payment Details:</h3>
          <div className="space-y-1 text-sm text-blue-800">
            <div><strong>Reference:</strong> {paymentData.paymentReference}</div>
            <div><strong>Plan:</strong> {paymentData.planType === "premium" ? "Premium" : "Premium Plus"}</div>
            <div><strong>Expected Amount:</strong> {paymentData.amount.toFixed(8)} {getCryptoSymbol()}</div>
            <div>
              <strong>Address:</strong>
              <div className="font-mono text-xs break-all mt-1 p-2 bg-white rounded border">
                {paymentData.paymentAddress}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Transaction Hash */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Hash <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.transactionHash}
              onChange={(e) => handleInputChange("transactionHash", e.target.value)}
              placeholder="Enter the transaction hash from your wallet"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Copy this from your wallet&apos;s transaction history (64 characters)
            </p>
          </div>

          {/* From Address (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Address (Optional)
            </label>
            <input
              type="text"
              value={form.fromAddress}
              onChange={(e) => handleInputChange("fromAddress", e.target.value)}
              placeholder="Your wallet address that sent the payment"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
          </div>

          {/* Transaction Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.00000001"
                value={form.amount}
                onChange={(e) => handleInputChange("amount", e.target.value)}
                placeholder="0.00000000"
                className="w-full p-3 pr-16 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                required
              />
              <div className="absolute right-3 top-3 text-gray-500 font-medium">
                {getCryptoSymbol()}
              </div>
            </div>
          </div>

          {/* Screenshot Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transaction Screenshot (Optional)
            </label>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive
                  ? "border-blue-500 bg-blue-50"
                  : form.screenshot
                  ? "border-green-500 bg-green-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragEvents}
              onDrop={handleDrop}
            >
              {form.screenshot ? (
                <div className="space-y-2">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
                  <p className="text-green-700">Screenshot uploaded successfully</p>
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, screenshot: "" }))}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                  <p className="text-gray-600">
                    Drag and drop a screenshot, or{" "}
                    <label className="text-blue-600 hover:text-blue-800 cursor-pointer">
                      browse to upload
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                        className="hidden"
                      />
                    </label>
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Any additional information about your payment..."
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <strong>Important:</strong> Make sure all information is accurate. 
                Our admin team will verify your payment on the blockchain. 
                False information may result in payment rejection.
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex space-x-4">
            <Button
              type="button"
              onClick={onBack}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg"
              disabled={submitting}
            >
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                "Submit Proof"
              )}
            </Button>
          </div>
        </form>

        {/* Support */}
        <div className="text-center mt-6 text-sm text-gray-500">
          Need help? <a href="/support" className="text-blue-600 hover:underline">Contact Support</a>
        </div>
      </Card>
    </div>
  );
}
