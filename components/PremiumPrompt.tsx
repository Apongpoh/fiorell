"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Zap, Lock, X } from 'lucide-react';
import Link from 'next/link';
import { useSubscription } from '@/hooks/useSubscription';

interface PremiumPromptProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
  title: string;
  description: string;
  requiresPremiumPlus?: boolean;
}

export function PremiumPrompt({ 
  isOpen, 
  onClose, 
  title, 
  description, 
  requiresPremiumPlus = false 
}: PremiumPromptProps) {
  const { isPremium, isPremiumPlus } = useSubscription();

  // Don't show if user already has required subscription
  if (requiresPremiumPlus && isPremiumPlus) return null;
  if (!requiresPremiumPlus && isPremium) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>

              {/* Icon */}
              <div className="text-center mb-6">
                <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                  requiresPremiumPlus 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                    : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                }`}>
                  {requiresPremiumPlus ? (
                    <Crown className="h-8 w-8 text-white" />
                  ) : (
                    <Zap className="h-8 w-8 text-white" />
                  )}
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {title}
                </h3>
                
                <p className="text-gray-600 text-sm">
                  {description}
                </p>
              </div>

              {/* Premium Features */}
              <div className="mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700">
                      {requiresPremiumPlus ? 'Premium Plus' : 'Premium'} Feature
                    </span>
                  </div>
                  
                  <ul className="space-y-2 text-sm text-gray-600">
                    {requiresPremiumPlus ? (
                      <>
                        <li>• All Premium features</li>
                        <li>• Unlimited Super Boosts</li>
                        <li>• Incognito mode</li>
                        <li>• Message before matching</li>
                        <li>• Travel mode</li>
                      </>
                    ) : (
                      <>
                        <li>• Unlimited likes</li>
                        <li>• See who liked you</li>
                        <li>• Advanced filters</li>
                        <li>• Read receipts</li>
                        <li>• Priority support</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="space-y-3">
                <Link href="/subscription" onClick={onClose}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
                      requiresPremiumPlus
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600'
                    }`}
                  >
                    Upgrade to {requiresPremiumPlus ? 'Premium Plus' : 'Premium'}
                  </motion.button>
                </Link>
                
                <button
                  onClick={onClose}
                  className="w-full py-3 px-4 rounded-lg font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook for managing premium prompts
export function usePremiumPrompt() {
  const [prompt, setPrompt] = React.useState<{
    isOpen: boolean;
    feature: string;
    title: string;
    description: string;
    requiresPremiumPlus: boolean;
  }>({
    isOpen: false,
    feature: '',
    title: '',
    description: '',
    requiresPremiumPlus: false,
  });

  const showPrompt = React.useCallback((
    feature: string,
    title: string,
    description: string,
    requiresPremiumPlus = false
  ) => {
    setPrompt({
      isOpen: true,
      feature,
      title,
      description,
      requiresPremiumPlus,
    });
  }, []);

  const hidePrompt = React.useCallback(() => {
    setPrompt(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    ...prompt,
    showPrompt,
    hidePrompt,
    PremiumPrompt: (props: Omit<PremiumPromptProps, 'isOpen' | 'onClose' | 'feature' | 'title' | 'description' | 'requiresPremiumPlus'>) => (
      <PremiumPrompt
        {...props}
        isOpen={prompt.isOpen}
        onClose={hidePrompt}
        feature={prompt.feature}
        title={prompt.title}
        description={prompt.description}
        requiresPremiumPlus={prompt.requiresPremiumPlus}
      />
    ),
  };
}

// Component for wrapping premium features
interface PremiumFeatureWrapperProps {
  children: React.ReactNode;
  feature: 'see_who_liked' | 'advanced_filters' | 'incognito' | 'message_before_match' | 'travel_mode';
  title: string;
  description: string;
  fallback?: React.ReactNode;
  className?: string;
}

export function PremiumFeatureWrapper({ 
  children, 
  feature, 
  title, 
  description, 
  fallback,
  className = '' 
}: PremiumFeatureWrapperProps) {
  const { isPremium, isPremiumPlus } = useSubscription();
  const { showPrompt, PremiumPrompt } = usePremiumPrompt();
  
  const premiumPlusFeatures = ['incognito', 'message_before_match', 'travel_mode'];
  const requiresPremiumPlus = premiumPlusFeatures.includes(feature);
  
  const hasAccess = requiresPremiumPlus ? isPremiumPlus : isPremium;
  
  const handleClick = () => {
    if (!hasAccess) {
      showPrompt(feature, title, description, requiresPremiumPlus);
    }
  };

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return (
      <div className={className} onClick={handleClick}>
        {fallback}
        <PremiumPrompt />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
      <div 
        className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-lg cursor-pointer"
        onClick={handleClick}
      >
        <div className="bg-white rounded-full p-2 shadow-lg">
          <Lock className="h-4 w-4 text-gray-600" />
        </div>
      </div>
      <PremiumPrompt />
    </div>
  );
}