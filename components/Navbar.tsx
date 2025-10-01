"use client";

import { Heart } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface NavbarProps {
  showAuthButtons?: boolean;
}

export default function Navbar({ showAuthButtons = true }: NavbarProps) {
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
        
        {showAuthButtons && (
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
      </nav>
    </header>
  );
}