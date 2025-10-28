"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  ExternalLink,
  Search,
  Filter,
  AlertCircle,
  User,
  Bitcoin,
  Calendar,
  DollarSign,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/contexts/NotificationContext";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface PaymentProof {
  paymentId: string;
  paymentReference: string;
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    memberSince: string;
  };
  cryptocurrency: string;
  amount: number;
  amountUSD: number;
  expectedAmountSat?: number;
  planType: string;
  planDuration: string;
  status: string;
  statusDisplay: string;
  userProof: {
    transactionHash: string;
    fromAddress?: string;
    amount: number;
    submittedAt: string;
    notes?: string;
    screenshot?: string;
  } | null;
  adminVerification?: {
    verifiedBy: string;
    verifiedAt: string;
    status: "approved" | "rejected";
    notes?: string;
  } | null;
  createdAt: string;
  userConfirmedAt?: string;
  adminVerifiedAt?: string;
  confirmedAt?: string;
  expiresAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

type FilterStatus = "all" | "pending_verification" | "user_confirmed" | "admin_verifying" | "confirmed" | "failed";

export default function AdminPaymentVerificationPage() {
  const [payments, setPayments] = useState<PaymentProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<PaymentProof | null>(null);
  const [verificationLoading, setVerificationLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("pending_verification");
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  const { user } = useAuth();
  const { showNotification } = useNotification();

  const fetchPayments = useCallback(async (page = 1, status = statusFilter) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("fiorell_auth_token");
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        status: status === "all" ? "" : status,
      });

      const response = await fetch(`/api/admin/verify-payment?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments);
        setPagination(data.pagination);
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch payments");
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      showNotification(
        error instanceof Error ? error.message : "Failed to load payments",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter, showNotification]);

  useEffect(() => {
    if (user?.isAdmin) {
      fetchPayments();
    }
  }, [user, fetchPayments]);

  const handleVerifyPayment = async (
    paymentId: string,
    status: "approved" | "rejected",
    notes?: string,
    blockchainVerified = false
  ) => {
    try {
      setVerificationLoading(paymentId);
      const token = localStorage.getItem("fiorell_auth_token");

      const response = await fetch("/api/admin/verify-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentId,
          status,
          notes,
          blockchainVerified,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showNotification(
          `Payment ${status} successfully`,
          "success"
        );
        
        // Refresh the payments list
        fetchPayments(pagination.page, statusFilter);
        setSelectedPayment(null);
      } else {
        throw new Error(data.error || "Failed to verify payment");
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      showNotification(
        error instanceof Error ? error.message : "Failed to verify payment",
        "error"
      );
    } finally {
      setVerificationLoading(null);
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
      case "user_confirmed":
        return "bg-blue-100 text-blue-800";
      case "admin_verifying":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredPayments = payments.filter(payment => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      payment.paymentReference.toLowerCase().includes(searchLower) ||
      payment.user.email.toLowerCase().includes(searchLower) ||
      payment.user.username?.toLowerCase().includes(searchLower) ||
      payment.userProof?.transactionHash.toLowerCase().includes(searchLower)
    );
  });

  if (!user || !user.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Verification Dashboard
          </h1>
          <p className="text-gray-600">
            Review and verify user-submitted cryptocurrency payment proofs
          </p>
        </div>

        {/* Filters and Search */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by reference, email, username, or tx hash..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full sm:w-80"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                >
                  <option value="pending_verification">Pending Verification</option>
                  <option value="user_confirmed">User Confirmed</option>
                  <option value="admin_verifying">Admin Verifying</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="failed">Failed</option>
                  <option value="all">All Payments</option>
                </select>
              </div>
            </div>

            {/* Stats */}
            <div className="flex space-x-4 text-sm">
              <div className="text-center">
                <div className="font-bold text-lg text-blue-600">{pagination.total}</div>
                <div className="text-gray-500">Total</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg text-yellow-600">
                  {payments.filter(p => p.status === "user_confirmed").length}
                </div>
                <div className="text-gray-500">Pending</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Payments List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredPayments.length === 0 ? (
          <Card className="p-8 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No payments found</h3>
            <p className="text-gray-500">
              {searchTerm 
                ? "No payments match your search criteria."
                : "No payment verifications are currently pending."}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPayments.map((payment) => (
              <motion.div
                key={payment.paymentId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(payment.status)}`}>
                          {payment.statusDisplay}
                        </span>
                        <span className="text-sm text-gray-500">
                          {payment.paymentReference}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium">{payment.user.displayName || payment.user.username}</div>
                            <div className="text-xs text-gray-500">{payment.user.email}</div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Bitcoin className="h-4 w-4 text-orange-500" />
                          <div>
                            <div className="text-sm font-medium">
                              {formatCrypto(payment.amount, payment.cryptocurrency)}
                            </div>
                            <div className="text-xs text-gray-500">${payment.amountUSD}</div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-green-500" />
                          <div>
                            <div className="text-sm font-medium">{payment.planType}</div>
                            <div className="text-xs text-gray-500">{payment.planDuration}</div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-blue-500" />
                          <div>
                            <div className="text-sm font-medium">
                              {payment.userConfirmedAt ? formatDate(payment.userConfirmedAt) : "Not submitted"}
                            </div>
                            <div className="text-xs text-gray-500">Submitted</div>
                          </div>
                        </div>
                      </div>

                      {payment.userProof && (
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">Payment Proof:</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Transaction Hash:</span>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-xs">{payment.userProof.transactionHash}</span>
                                <button
                                  onClick={() => openBlockchainExplorer(payment.userProof!.transactionHash, payment.cryptocurrency)}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            
                            {payment.userProof.fromAddress && (
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600">From Address:</span>
                                <span className="font-mono text-xs">{payment.userProof.fromAddress}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Reported Amount:</span>
                              <span className="font-medium">
                                {formatCrypto(payment.userProof.amount, payment.cryptocurrency)}
                              </span>
                            </div>

                            {payment.userProof.notes && (
                              <div>
                                <span className="text-gray-600">Notes:</span>
                                <p className="text-gray-800 mt-1">{payment.userProof.notes}</p>
                              </div>
                            )}

                            {payment.userProof.screenshot && (
                              <div>
                                <span className="text-gray-600">Screenshot:</span>
                                <div className="mt-2">
                                  <Image
                                    src={payment.userProof.screenshot}
                                    alt="Payment proof screenshot"
                                    className="max-w-xs rounded-lg border border-gray-200"
                                    width={500}
                                    height={300}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col space-y-2 ml-6">
                      {payment.status === "user_confirmed" && (
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => handleVerifyPayment(payment.paymentId, "approved", undefined, true)}
                            disabled={verificationLoading === payment.paymentId}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm"
                          >
                            {verificationLoading === payment.paymentId ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            Approve
                          </Button>
                          
                          <Button
                            onClick={() => {
                              const notes = prompt("Reason for rejection (optional):");
                              handleVerifyPayment(payment.paymentId, "rejected", notes || undefined);
                            }}
                            disabled={verificationLoading === payment.paymentId}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-sm"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </Button>
                        </div>
                      )}

                      <Button
                        onClick={() => setSelectedPayment(payment)}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        Details
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-8">
            <Button
              onClick={() => fetchPayments(pagination.page - 1, statusFilter)}
              disabled={!pagination.hasPrev}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700"
            >
              Previous
            </Button>
            
            <span className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </span>
            
            <Button
              onClick={() => fetchPayments(pagination.page + 1, statusFilter)}
              disabled={!pagination.hasNext}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Next
            </Button>
          </div>
        )}

        {/* Payment Details Modal */}
        {selectedPayment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Payment Details</h3>
                  <button
                    onClick={() => setSelectedPayment(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-900">Reference:</span>
                      <p className="text-gray-600">{selectedPayment.paymentReference}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">Status:</span>
                      <p className="text-gray-600">{selectedPayment.statusDisplay}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">User:</span>
                      <p className="text-gray-600">{selectedPayment.user.email}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">Plan:</span>
                      <p className="text-gray-600">{selectedPayment.planType} ({selectedPayment.planDuration})</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">Amount:</span>
                      <p className="text-gray-600">
                        {formatCrypto(selectedPayment.amount, selectedPayment.cryptocurrency)} (${selectedPayment.amountUSD})
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">Created:</span>
                      <p className="text-gray-600">{formatDate(selectedPayment.createdAt)}</p>
                    </div>
                  </div>

                  {selectedPayment.userProof && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-gray-900 mb-3">Payment Proof</h4>
                      <div className="space-y-3 text-sm">
                        <div>
                          <span className="font-medium text-gray-900">Transaction Hash:</span>
                          <div className="flex items-center space-x-2 mt-1">
                            <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                              {selectedPayment.userProof.transactionHash}
                            </code>
                            <button
                              onClick={() => openBlockchainExplorer(selectedPayment.userProof!.transactionHash, selectedPayment.cryptocurrency)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {selectedPayment.userProof.notes && (
                          <div>
                            <span className="font-medium text-gray-900">User Notes:</span>
                            <p className="text-gray-600 mt-1">{selectedPayment.userProof.notes}</p>
                          </div>
                        )}

                        {selectedPayment.userProof.screenshot && (
                          <div>
                            <span className="font-medium text-gray-900">Screenshot:</span>
                            <div className="mt-2">
                              <Image
                                src={selectedPayment.userProof.screenshot}
                                alt="Payment proof screenshot"
                                className="max-w-full rounded-lg border border-gray-200"
                                width={500}
                                height={300}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {selectedPayment.adminVerification && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-gray-900 mb-3">Admin Verification</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="font-medium text-gray-900">Status:</span>
                          <p className="text-gray-600">{selectedPayment.adminVerification.status}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">Verified At:</span>
                          <p className="text-gray-600">{formatDate(selectedPayment.adminVerification.verifiedAt)}</p>
                        </div>
                        {selectedPayment.adminVerification.notes && (
                          <div>
                            <span className="font-medium text-gray-900">Admin Notes:</span>
                            <p className="text-gray-600">{selectedPayment.adminVerification.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {selectedPayment.status === "user_confirmed" && (
                  <div className="flex space-x-4 mt-6 pt-6 border-t">
                    <Button
                      onClick={() => {
                        const notes = prompt("Add verification notes (optional):");
                        handleVerifyPayment(selectedPayment.paymentId, "approved", notes || undefined, true);
                      }}
                      disabled={verificationLoading === selectedPayment.paymentId}
                      className="bg-green-600 hover:bg-green-700 text-white flex-1"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve Payment
                    </Button>
                    
                    <Button
                      onClick={() => {
                        const notes = prompt("Reason for rejection:");
                        if (notes) {
                          handleVerifyPayment(selectedPayment.paymentId, "rejected", notes);
                        }
                      }}
                      disabled={verificationLoading === selectedPayment.paymentId}
                      className="bg-red-600 hover:bg-red-700 text-white flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject Payment
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}