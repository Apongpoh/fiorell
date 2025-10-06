"use client";

import { useState } from "react";
import { useNotification } from "@/contexts/NotificationContext";
import { withAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import { ArrowLeft, Flag } from "lucide-react";

function ReportPage() {
  const { showNotification } = useNotification();
  const [targetUserId, setTargetUserId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submitReport = async () => {
    try {
      if (!targetUserId.trim()) {
        showNotification("Please provide a user ID or profile URL", "error");
        return;
      }
      setSubmitting(true);
      const resp = await fetch("/api/user/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("fiorell_auth_token")}`,
        },
        body: JSON.stringify({ targetUserId: targetUserId.trim(), reason }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to submit report");
      showNotification("Report submitted. Our team will review.", "success");
      setTargetUserId("");
      setReason("");
    } catch (e: unknown) {
      const msg =
        typeof e === "object" && e && "message" in e
          ? (e as { message: string }).message
          : String(e);
      showNotification(msg || "Failed to submit report", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <Link
            href="/settings/privacy"
            className="flex items-center space-x-2 text-gray-600 hover:text-pink-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </Link>
          <div className="flex items-center space-x-2">
            <Flag className="h-6 w-6 text-yellow-600" />
            <span className="text-xl font-bold text-gray-900">
              Report a User
            </span>
          </div>
          <div className="w-12" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-6">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-4">
            Provide the user ID or paste the profile URL you want to report and
            include an optional reason.
          </p>
          <div className="space-y-3">
            <input
              type="text"
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              placeholder="User ID or profile URL"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
            />
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Reason (optional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
            />
            <button
              onClick={submitReport}
              disabled={submitting}
              className="w-full px-6 py-3 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default withAuth(ReportPage);
