"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, LifeBuoy } from "lucide-react";
import { useNotification } from "@/contexts/NotificationContext";

export default function SupportPage() {
  const { showNotification } = useNotification();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [tickets, setTickets] = useState<
    Array<{ _id: string; subject: string; status: string; createdAt: string }>
  >([]);

  useEffect(() => {
    const loadTickets = async () => {
      try {
        const resp = await fetch("/api/support", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem(
              "fiorell_auth_token"
            )}`,
          },
        });
        if (resp.ok) {
          const data = await resp.json();
          setTickets(Array.isArray(data.tickets) ? data.tickets : []);
        }
      } catch {}
    };
    loadTickets();
  }, []);

  const submitTicket = async () => {
    try {
      if (!subject.trim() || !message.trim()) {
        showNotification("Please fill in subject and message", "error");
        return;
      }
      setSubmitting(true);
      const resp = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("fiorell_auth_token")}`,
        },
        body: JSON.stringify({ subject, message }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to submit ticket");
      showNotification("Support ticket submitted", "success");
      setTickets((prev) => [
        {
          _id: data.ticket._id,
          subject: data.ticket.subject,
          status: data.ticket.status,
          createdAt: data.ticket.createdAt,
        },
        ...prev,
      ]);
      setSubject("");
      setMessage("");
    } catch {
      showNotification("Failed to submit ticket", "error");
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
            <LifeBuoy className="h-6 w-6 text-pink-500" />
            <span className="text-xl font-bold text-gray-900">Support</span>
          </div>
          <div className="w-12" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="Describe your issue"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
          />
          <button
            onClick={submitTicket}
            disabled={submitting}
            className="w-full px-6 py-3 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 transition-colors disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
        {tickets.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mt-4">
            <h3 className="text-md font-semibold text-gray-900 mb-2">
              Your Tickets
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              {tickets.map((t) => (
                <li key={t._id} className="flex items-center justify-between">
                  <span className="font-medium">{t.subject}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(t.createdAt).toLocaleString()} • {t.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
