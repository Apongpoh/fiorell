"use client";

import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import {
  Heart,
  ArrowLeft,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

function VerifyEmailContent() {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const verifyEmail = async () => {
      const code = searchParams.get("code");
      const email = searchParams.get("email");

      if (!code || !email) {
        setError(
          "Invalid verification link. Please check your email for the correct link."
        );
        setIsVerifying(false);
        return;
      }

      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code, email }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to verify email");
        }

        setIsVerified(true);

        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login?verified=true");
        }, 3000);
      } catch (error: unknown) {
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError("An error occurred during verification");
        }
      } finally {
        setIsVerifying(false);
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  const handleResendVerification = async () => {
    const email = searchParams.get("email");
    if (!email) return;

    setIsResending(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Failed to resend verification email"
        );
      }

      // Show success message
      setError("Verification email sent! Please check your inbox.");
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Failed to resend verification email");
      }
    } finally {
      setIsResending(false);
    }
  };

  // Loading state
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <header className="px-6 py-4">
          <div className="flex items-center space-x-4 max-w-md mx-auto">
            <div className="flex items-center space-x-2">
              <Heart className="h-6 w-6 text-pink-500" />
              <span className="text-xl font-bold text-gray-900">Fiorell</span>
            </div>
          </div>
        </header>

        <main className="px-6 py-16">
          <div className="max-w-md mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Verifying Your Email...
              </h1>

              <p className="text-gray-600">
                Please wait while we verify your email address.
              </p>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  // Success state
  if (isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <header className="px-6 py-4">
          <div className="flex items-center space-x-4 max-w-md mx-auto">
            <div className="flex items-center space-x-2">
              <Heart className="h-6 w-6 text-pink-500" />
              <span className="text-xl font-bold text-gray-900">Fiorell</span>
            </div>
          </div>
        </header>

        <main className="px-6 py-16">
          <div className="max-w-md mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>

              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Email Verified Successfully!
              </h1>

              <p className="text-gray-600 mb-6">
                Welcome to Fiorell! Your email has been verified and your
                account is now active.
              </p>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-700">
                  🎉 You're all set! Redirecting you to login...
                </p>
              </div>

              <Link
                href="/login"
                className="inline-block w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all"
              >
                Continue to Login
              </Link>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      <header className="px-6 py-4">
        <div className="flex items-center space-x-4 max-w-md mx-auto">
          <Link
            href="/signup"
            className="flex items-center space-x-2 text-gray-600 hover:text-pink-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Signup</span>
          </Link>
          <div className="flex items-center space-x-2">
            <Heart className="h-6 w-6 text-pink-500" />
            <span className="text-xl font-bold text-gray-900">Fiorell</span>
          </div>
        </div>
      </header>

      <main className="px-6 py-16">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8 text-center"
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Verification Failed
            </h1>

            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>

            <div className="space-y-3">
              {searchParams.get("email") && (
                <button
                  onClick={handleResendVerification}
                  disabled={isResending}
                  className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:transform-none"
                >
                  {isResending ? "Sending..." : "Resend Verification Email"}
                </button>
              )}

              <Link
                href="/signup"
                className="block w-full px-6 py-3 text-gray-700 bg-gray-100 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Back to Signup
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50">
          <p className="text-gray-600">Loading...</p>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
