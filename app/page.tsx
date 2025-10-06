"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Heart, Users, MessageCircle, Sparkles } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div
      className="min-h-screen relative"
      style={{
        backgroundImage: `url('/pattern-randomized.svg'), linear-gradient(135deg, #fce7f3 0%, #f3e8ff 40%, #e0f2fe 100%)`,
        backgroundSize: "cover, cover",
        backgroundRepeat: "no-repeat, no-repeat",
        backgroundPosition: "center, center",
        backgroundBlendMode: "multiply",
      }}
    >
      {/* SVG background pattern, absolutely positioned, behind all content */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          width: "100vw",
          height: "100vh",
          zIndex: -1,
          pointerEvents: "none",
          overflow: "hidden",
        }}
        aria-hidden="true"
      >
        <Image
          src="/pattern-randomized.svg"
          alt="Background pattern"
          fill
          style={{ objectFit: "cover" }}
          draggable={false}
          priority
        />
      </div>
      {/* Header */}
      <header className="relative px-6 py-4">
        <nav className="flex items-center justify-between max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-2"
          >
            <Heart className="h-8 w-8 text-pink-500" />
            <span className="text-2xl font-bold text-gray-900">Fiorell</span>
          </motion.div>

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
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-5xl md:text-7xl font-bold text-gray-900 mb-6"
            >
              Find Your
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
                {" "}
                Perfect Match
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto"
            >
              Connect with like-minded people, build meaningful relationships,
              and discover love that lasts a lifetime.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link
                href="/signup"
                className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full text-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all"
              >
                Start Your Journey
              </Link>
              <Link
                href="/about"
                className="px-8 py-4 border-2 border-pink-500 text-pink-500 rounded-full text-lg font-semibold hover:bg-pink-500 hover:text-white transition-all"
              >
                Learn More
              </Link>
            </motion.div>
          </div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="grid md:grid-cols-3 gap-8 mt-24"
          >
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-pink-100 rounded-full mb-6">
                <Users className="h-8 w-8 text-pink-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Smart Matching
              </h3>
              <p className="text-gray-600">
                Our advanced algorithm connects you with compatible partners
                based on your interests and values.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-6">
                <MessageCircle className="h-8 w-8 text-purple-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Meaningful Conversations
              </h3>
              <p className="text-gray-600">
                Break the ice with conversation starters and build deeper
                connections through thoughtful chats.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-6">
                <Sparkles className="h-8 w-8 text-yellow-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Safe & Secure
              </h3>
              <p className="text-gray-600">
                Your privacy and safety are our top priorities with verified
                profiles and secure messaging.
              </p>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 px-6 mt-16">
        <div className="max-w-7xl mx-auto text-center text-gray-600">
          <p>&copy; 2025 Fiorell. Made with ❤️ for meaningful connections.</p>
        </div>
      </footer>
    </div>
  );
}
