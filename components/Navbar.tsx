"use client";

import { Heart, Crown, Bitcoin, Search } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

interface NavbarProps {
  showAuthButtons?: boolean;
}

export default function Navbar({ showAuthButtons = true }: NavbarProps) {
  const { user: currentUser } = useAuth();

  return (
    <header className="relative px-6 py-4">
      <nav className="flex items-center justify-between max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center space-x-2"
        >
          <Link href="/" className="flex items-center space-x-2">
            <Heart className="h-8 w-8 text-pink-500" />
            <span className="text-2xl font-bold text-gray-900">Fiorell</span>
          </Link>
        </motion.div>

        <div className="flex items-center space-x-6">
          {/* Crypto Premium Link */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="hidden md:block"
          >
            <Link
              href="/subscription/crypto"
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-full hover:from-orange-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Bitcoin className="w-4 h-4" />
              <span className="font-semibold">Crypto Premium</span>
              <Crown className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Payment Tracking Link */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="hidden lg:block"
          >
            <Link
              href="/payment-tracking"
              className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:text-blue-600 transition-colors"
            >
              <Search className="w-4 h-4" />
              <span className="text-sm">Track Payment</span>
            </Link>
          </motion.div>

          {showAuthButtons && !currentUser && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4"
            >
              <Link
                href="/login"
                className="px-4 py-2 text-gray-700 hover:text-pink-600 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-6 py-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 transition-colors"
              >
                Join Now
              </Link>
            </motion.div>
          )}

          {currentUser && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center space-x-4"
            >
              <Link
                href="/dashboard"
                className="px-4 py-2 text-gray-700 hover:text-pink-600 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/settings"
                className="px-4 py-2 text-gray-700 hover:text-pink-600 transition-colors"
              >
                Settings
              </Link>
            </motion.div>
          )}
        </div>
      </nav>
    </header>
  );
}
