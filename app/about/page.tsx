"use client";

import { motion } from "framer-motion";
import {
  Heart,
  ArrowLeft,
  Shield,
  Users,
  MessageCircle,
  Sparkles,
  Star,
  Clock,
  Award,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const features = [
  {
    icon: Users,
    title: "Smart Matching Algorithm",
    description:
      "Our AI-powered system learns your preferences and suggests compatible matches based on shared interests, values, and lifestyle choices.",
  },
  {
    icon: Shield,
    title: "Safe & Secure Platform",
    description:
      "Your privacy and safety are our top priorities. All profiles are verified, and we use advanced security measures to protect your data.",
  },
  {
    icon: MessageCircle,
    title: "Meaningful Conversations",
    description:
      "Break the ice with thoughtful conversation starters and build deeper connections through our enhanced messaging features.",
  },
  {
    icon: Sparkles,
    title: "Premium Experience",
    description:
      "Enjoy an ad-free experience with additional features like unlimited likes, read receipts, and advanced filters.",
  },
];

const stats = [
  { number: "2M+", label: "Active Users" },
  { number: "500K+", label: "Successful Matches" },
  { number: "150K+", label: "Relationships Formed" },
  { number: "4.8★", label: "App Store Rating" },
];

const testimonials = [
  {
    name: "Sarah & Michael",
    story:
      "We matched on Fiorell 8 months ago and got engaged last month! The app&apos;s focus on meaningful connections really made the difference.",
    image: "/api/placeholder/100/100",
  },
  {
    name: "Emma & David",
    story:
      "Found my best friend and soulmate through Fiorell. The conversation starters helped us discover our shared love for hiking and travel.",
    image: "/api/placeholder/100/100",
  },
  {
    name: "Jessica & Alex",
    story:
      "After trying other dating apps, Fiorell felt different. The quality of matches and genuine connections here are unmatched.",
    image: "/api/placeholder/100/100",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      {/* Header */}
      <header className="px-6 py-4">
        <div className="flex items-center space-x-4 max-w-4xl mx-auto">
          <Link
            href="/"
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

      <main className="px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              About{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
                Fiorell
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              We believe that everyone deserves to find meaningful connections.
              Fiorell is designed to help you discover genuine relationships
              built on shared values, interests, and authentic connections.
            </p>
          </motion.div>

          {/* Stats Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16"
          >
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-pink-500 mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Features Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-16"
          >
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
              What Makes Fiorell Special
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="bg-white rounded-2xl p-8 shadow-sm">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                      <feature.icon className="h-6 w-6 text-pink-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {feature.title}
                    </h3>
                  </div>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Success Stories */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-16"
          >
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
              Success Stories
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center space-x-4 mb-4">
                    <Image
                      src={testimonial.image}
                      width={48}
                      height={48}
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {testimonial.name}
                      </h4>
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className="h-4 w-4 text-yellow-400 fill-current"
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 italic">
                    &ldquo;{testimonial.story}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Mission Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="bg-white rounded-2xl p-8 md:p-12 shadow-sm mb-16"
          >
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Our Mission
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto">
                At Fiorell, we&lsquo;re committed to creating a platform where
                authentic connections flourish. We believe that the best
                relationships start with genuine compatibility and shared
                values. Our goal is to help you find not just a date, but a
                meaningful connection that could last a lifetime.
              </p>
            </div>
          </motion.div>

          {/* Safety & Privacy */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="grid md:grid-cols-3 gap-8 mb-16"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Privacy First
              </h3>
              <p className="text-gray-600">
                Your personal information is encrypted and protected with
                industry-leading security measures.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Verified Profiles
              </h3>
              <p className="text-gray-600">
                All profiles go through our verification process to ensure
                authentic and genuine users.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-purple-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                24/7 Support
              </h3>
              <p className="text-gray-600">
                Our dedicated support team is always here to help ensure your
                experience is safe and positive.
              </p>
            </div>
          </motion.div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="text-center"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Ready to Find Your Perfect Match?
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Join millions of people who have found meaningful connections on
              Fiorell. Your next great relationship could be just a swipe away.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full text-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all"
              >
                Get Started Today
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 border-2 border-pink-500 text-pink-500 rounded-full text-lg font-semibold hover:bg-pink-500 hover:text-white transition-all"
              >
                Sign In
              </Link>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 px-6 mt-16">
        <div className="max-w-4xl mx-auto text-center text-gray-600">
          <p>&copy; 2025 Fiorell. Made with ❤️ for meaningful connections.</p>
        </div>
      </footer>
    </div>
  );
}
