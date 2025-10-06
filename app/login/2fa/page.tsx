"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, ArrowLeft, Shield } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/contexts/NotificationContext";

export default function TwoFactorAuthPage() {
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const router = useRouter();
  const { login } = useAuth();
  const { showNotification } = useNotification();

  // Check if user has temp_user_id and verify it's valid
  useEffect(() => {
    const tempUserId = localStorage.getItem('temp_user_id');
    const expiresAt = localStorage.getItem('temp_session_expires');
    
    if (!tempUserId) {
      router.replace('/login');
      return;
    }

    // Check if session has expired
    if (expiresAt && Date.now() > parseInt(expiresAt)) {
      localStorage.removeItem('temp_user_id');
      localStorage.removeItem('temp_session_expires');
      setError('Session expired. Please login again.');
      setTimeout(() => router.replace('/login'), 2000);
      return;
    }

    // Verify the temp user ID is still valid
    const verifyTempSession = async () => {
      try {
        const response = await fetch('/api/auth/verify-temp-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tempUserId }),
        });

        if (!response.ok) {
          // Temp session is invalid or expired
          localStorage.removeItem('temp_user_id');
          localStorage.removeItem('temp_session_expires');
          router.replace('/login');
        }
      } catch {
        // Network error or invalid session
        localStorage.removeItem('temp_user_id');
        localStorage.removeItem('temp_session_expires');
        router.replace('/login');
      }
    };

    verifyTempSession();
  }, [router]);

  // Focus first input on mount
  useEffect(() => {
    const first = inputRefs.current[0];
    first?.focus();
    first?.select();
  }, []);

  const handleDigitChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    
    // Handle pasted content
    if (value.length > 1) {
      const digits = value.replace(/[^0-9]/g, "").slice(0, 6);
      setVerificationCode(digits.padEnd(6, ""));
      
      // Focus on the last filled position or next empty
      const focusIndex = Math.min(digits.length, 5);
      setTimeout(() => {
        inputRefs.current[focusIndex]?.focus();
      }, 0);
      return;
    }
    
    // Handle single digit input
    const digit = value.replace(/[^0-9]/g, "");
    const codeArray = verificationCode.padEnd(6, "").split("");
    
    if (digit) {
      codeArray[index] = digit;
      setVerificationCode(codeArray.join(""));
      
      // Move to next input
      if (index < 5) {
        setTimeout(() => {
          inputRefs.current[index + 1]?.focus();
        }, 0);
      }
    } else {
      // Clear current position
      codeArray[index] = "";
      setVerificationCode(codeArray.join(""));
    }
  };

  const handleDigitKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    const key = e.key;

    // Move left/right with arrows
    if (key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
      e.preventDefault();
      return;
    }
    if (key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
      e.preventDefault();
      return;
    }

    // Backspace behavior
    if (key === "Backspace") {
      e.preventDefault();
      const codeArray = verificationCode.padEnd(6, "").split("");
      
      if (codeArray[index]) {
        // Clear current digit
        codeArray[index] = "";
        setVerificationCode(codeArray.join(""));
      } else if (index > 0) {
        // Move to previous and clear it
        codeArray[index - 1] = "";
        setVerificationCode(codeArray.join(""));
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePasteCode = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
    if (!text) return;

    setVerificationCode(text.slice(0, 6).padEnd(6, ""));

    const lastFilledIndex = Math.min(text.length - 1, 5);
    setTimeout(() => {
      inputRefs.current[lastFilledIndex]?.focus();
    }, 0);
  };

  const handleVerify = async () => {
    if (!/^\d{6}$/.test(verificationCode)) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const tempUserId = localStorage.getItem('temp_user_id');
      if (!tempUserId) {
        throw new Error("Session expired. Please login again.");
      }

      const response = await fetch('/api/auth/login/2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tempUserId,
          code: verificationCode,
          timestamp: Date.now(), // Add timestamp for verification
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Clear temp session on failed attempts
        if (response.status === 401 || response.status === 429) {
          localStorage.removeItem('temp_user_id');
          if (response.status === 429) {
            setError('Too many failed attempts. Please login again.');
            setTimeout(() => router.replace('/login'), 2000);
            return;
          }
        }
        throw new Error(data.error || 'Verification failed');
      }

      // Store token and set user
      localStorage.setItem('fiorell_auth_token', data.token);
      localStorage.removeItem('temp_user_id');
      localStorage.removeItem('temp_session_expires');
      
      // Force a page reload to reinitialize the AuthContext with the new token
      // This ensures the user state is properly loaded before navigation
      window.location.href = '/dashboard';

    } catch (error: any) {
      setError(error.message || 'Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      {/* Header */}
      <header className="px-6 py-4">
        <div className="flex items-center space-x-4 max-w-md mx-auto">
          <Link
            href="/login"
            className="flex items-center space-x-2 text-gray-600 hover:text-pink-600 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </Link>
          <div className="flex items-center space-x-2">
            <Heart className="h-6 w-6 text-pink-500" />
            <span className="text-xl font-bold text-gray-900">Fiorell</span>
          </div>
        </div>
      </header>

      {/* 2FA Form */}
      <main className="px-6 py-16">
        <div className="max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Two-Factor Authentication
              </h1>
              <p className="text-gray-600">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Six box input for 2FA code */}
            <div className="flex justify-between gap-2 mb-6">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <input
                  key={i}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  pattern="[0-9]"
                  className="w-12 h-14 text-center text-xl border border-gray-300 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-colors"
                  value={verificationCode.charAt(i) || ""}
                  onChange={(e) => handleDigitChange(i, e)}
                  onKeyDown={(e) => handleDigitKeyDown(i, e)}
                  onPaste={handlePasteCode}
                  onFocus={(e) => {
                    e.currentTarget.select();
                  }}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  id={`2fa-code-${i}`}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <button
              onClick={handleVerify}
              disabled={isVerifying || !/^\d{6}$/.test(verificationCode)}
              className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isVerifying ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Verifying...</span>
                </div>
              ) : (
                "Verify & Continue"
              )}
            </button>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Having trouble?{" "}
                <Link
                  href="/login"
                  className="text-pink-600 hover:text-pink-700 font-medium"
                >
                  Try again
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}