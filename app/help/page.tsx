"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Mail,
  X,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useNotification } from "@/contexts/NotificationContext";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQ[] = [
  {
    id: "1",
    question: "How does the matching algorithm work?",
    answer:
      "Our smart matching algorithm considers your interests, location, age preferences, and activity patterns to suggest compatible profiles. The more you use the app, the better our recommendations become.",
    category: "Matching",
  },
  {
    id: "2",
    question: "How do I verify my profile?",
    answer:
      "To verify your profile, go to Settings > Profile Verification and follow the photo verification process. You'll need to take a selfie following specific instructions to confirm your identity.",
    category: "Profile",
  },
  {
    id: "3",
    question: "Can I change my location?",
    answer:
      "Yes, you can update your location in your profile settings. Premium users can also use our Passport feature to match with people in other cities.",
    category: "Profile",
  },
  {
    id: "4",
    question: "What happens when I delete my account?",
    answer:
      "When you delete your account, your profile will be permanently removed from our servers. Your matches won't be able to see your profile or message you. This action cannot be undone.",
    category: "Account",
  },
  {
    id: "5",
    question: "How do I report someone?",
    answer:
      "You can report a user by going to their profile, tapping the three dots menu, and selecting 'Report'. Choose the appropriate reason and provide additional details if needed.",
    category: "Safety",
  },
  {
    id: "6",
    question: "Why can't I see my matches?",
    answer:
      "Make sure you have a stable internet connection. If matches still don't appear, try refreshing the app or logging out and back in. Contact support if the issue persists.",
    category: "Technical",
  },
  {
    id: "7",
    question: "How do I cancel my subscription?",
    answer:
      "To cancel your subscription, go to Settings > Subscription and select 'Cancel Subscription'. You can also manage your subscription through your device's app store settings.",
    category: "Billing",
  },
  {
    id: "8",
    question: "What are Super Likes?",
    answer:
      "Super Likes are a way to show someone you're really interested. When you Super Like someone, they'll see that you liked them before they decide whether to like you back.",
    category: "Features",
  },
];

const categories = [
  "All",
  "Matching",
  "Profile",
  "Account",
  "Safety",
  "Technical",
  "Billing",
  "Features",
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportType, setSupportType] = useState<"chat" | "email">("chat");
  const [supportForm, setSupportForm] = useState({
    subject: "",
    message: "",
    priority: "medium" as "low" | "medium" | "high",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showNotification } = useNotification();

  const filteredFAQs = faqs.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const handleSupportSubmit = async () => {
    if (!supportForm.subject.trim() || !supportForm.message.trim()) {
      showNotification("Please fill in all required fields", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("fiorell_auth_token")}`,
        },
        body: JSON.stringify({
          type: supportType,
          subject: supportForm.subject,
          message: supportForm.message,
          priority: supportForm.priority,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit support request");
      }

      showNotification(
        supportType === "chat"
          ? "Chat request submitted! We'll respond soon."
          : "Email sent successfully! Check your inbox for confirmation.",
        "success"
      );

      // Reset form
      setSupportForm({ subject: "", message: "", priority: "medium" });
      setShowSupportModal(false);
    } catch (error) {
      console.error("Support submission error:", error);
      showNotification(
        error instanceof Error ? error.message : "Failed to submit support request",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openSupportModal = (type: "chat" | "email") => {
    setSupportType(type);
    setShowSupportModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <Link
            href="/profile"
            className="flex items-center space-x-2 text-gray-600 hover:text-pink-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </Link>
          <div className="flex items-center space-x-2">
            <HelpCircle className="h-6 w-6 text-pink-500" />
            <span className="text-xl font-bold text-gray-900">
              Help & Support
            </span>
          </div>
          <div className="w-12"></div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Search */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for help..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Categories
            </h2>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? "bg-pink-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* FAQs */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 pb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Frequently Asked Questions
              </h2>
              {searchQuery && (
                <p className="text-sm text-gray-600 mt-1">
                  {filteredFAQs.length} result
                  {filteredFAQs.length !== 1 ? "s" : ""} found
                </p>
              )}
            </div>

            <div className="divide-y divide-gray-100">
              {filteredFAQs.map((faq) => (
                <div key={faq.id}>
                  <button
                    onClick={() => toggleFAQ(faq.id)}
                    className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">
                          {faq.question}
                        </h3>
                        <span className="text-xs text-pink-500 bg-pink-100 px-2 py-1 rounded-full">
                          {faq.category}
                        </span>
                      </div>
                      {expandedFAQ === faq.id ? (
                        <ChevronUp className="h-5 w-5 text-gray-400 ml-4" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400 ml-4" />
                      )}
                    </div>
                  </button>

                  {expandedFAQ === faq.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-6 pb-4"
                    >
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </div>
              ))}

              {filteredFAQs.length === 0 && (
                <div className="p-6 text-center text-gray-500">
                  <HelpCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">No results found</p>
                  <p className="text-xs mt-1">
                    Try adjusting your search or browse by category
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Contact Support */}
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="p-6 pb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Still Need Help?
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Get in touch with our support team
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              <button 
                onClick={() => openSupportModal("chat")}
                className="flex items-center space-x-4 w-full p-6 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">Live Chat</h3>
                  <p className="text-sm text-gray-600">
                    Get instant help from our support team
                  </p>
                </div>
              </button>

              <button 
                onClick={() => openSupportModal("email")}
                className="flex items-center space-x-4 w-full p-6 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <Mail className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">Email Support</h3>
                  <p className="text-sm text-gray-600">support@fiorell.com</p>
                </div>
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="p-6 pb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Quick Links
              </h2>
            </div>

            <div className="divide-y divide-gray-100">
              <Link
                href="/terms"
                className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-900">Terms of Service</span>
                <ArrowLeft className="h-5 w-5 text-gray-400 rotate-180" />
              </Link>

              <Link
                href="/privacy-policy"
                className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-900">Privacy Policy</span>
                <ArrowLeft className="h-5 w-5 text-gray-400 rotate-180" />
              </Link>

              <Link
                href="/community-guidelines"
                className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-900">Community Guidelines</span>
                <ArrowLeft className="h-5 w-5 text-gray-400 rotate-180" />
              </Link>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowSupportModal(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-lg"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  {supportType === "chat" ? (
                    <MessageCircle className="h-6 w-6 text-blue-500" />
                  ) : (
                    <Mail className="h-6 w-6 text-green-500" />
                  )}
                  <h3 className="text-lg font-semibold text-gray-900">
                    {supportType === "chat" ? "Start Live Chat" : "Send Email"}
                  </h3>
                </div>
                <button
                  onClick={() => setShowSupportModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={supportForm.subject}
                    onChange={(e) =>
                      setSupportForm({ ...supportForm, subject: e.target.value })
                    }
                    placeholder="Brief description of your issue"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Priority
                  </label>
                  <select
                    value={supportForm.priority}
                    onChange={(e) =>
                      setSupportForm({
                        ...supportForm,
                        priority: e.target.value as "low" | "medium" | "high",
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    <option value="low">Low - General question</option>
                    <option value="medium">Medium - Account issue</option>
                    <option value="high">High - Urgent problem</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    value={supportForm.message}
                    onChange={(e) =>
                      setSupportForm({ ...supportForm, message: e.target.value })
                    }
                    placeholder="Please describe your issue in detail..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent resize-none"
                  />
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowSupportModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSupportSubmit}
                    disabled={isSubmitting}
                    className="flex items-center space-x-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50 transition-colors"
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span>{isSubmitting ? "Sending..." : "Send"}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
