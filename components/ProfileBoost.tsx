'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './ui/Button';
import { Card } from './ui/Card';
import { useSubscription } from '../hooks/useSubscription';
import { apiRequest } from '../lib/api';

interface ProfileBoostProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BoostStatus {
  hasActiveBoost: boolean;
  boostType?: 'daily' | 'weekly' | 'premium';
  expiresAt?: Date;
  dailyBoostsUsed: number;
  dailyBoostsLimit: number;
}

const ProfileBoost: React.FC<ProfileBoostProps> = ({ isOpen, onClose }) => {
  const { subscription } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [boostStatus, setBoostStatus] = useState<BoostStatus | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchBoostStatus();
    }
  }, [isOpen]);

  const fetchBoostStatus = async () => {
    try {
      const response = await apiRequest('/api/user/boost', {
        method: 'GET',
      }) as Response;
      if (response.ok) {
        const data = await response.json();
        setBoostStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch boost status:', error);
    }
  };

  const activateBoost = async (boostType: 'daily' | 'weekly' | 'premium') => {
    setLoading(true);
    try {
      const response = await apiRequest('/api/user/boost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ boostType }),
      }) as Response;

      if (response.ok) {
        await fetchBoostStatus();
        // Show success message
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to activate boost');
      }
    } catch (error) {
      console.error('Failed to activate boost:', error);
      alert('Failed to activate boost');
    } finally {
      setLoading(false);
    }
  };

  const getBoostDescription = (type: 'daily' | 'weekly' | 'premium') => {
    switch (type) {
      case 'daily':
        return {
          title: 'Daily Boost',
          description: '24-hour profile boost - Be one of the top profiles in your area',
          duration: '24 hours',
          availability: 'All users (3 per day)',
        };
      case 'weekly':
        return {
          title: 'Weekly Boost',
          description: '7-day profile boost - Stay at the top all week long',
          duration: '7 days',
          availability: 'Premium members only',
        };
      case 'premium':
        return {
          title: 'Premium Boost',
          description: 'Unlimited boosts - Always be visible to more people',
          duration: 'Unlimited',
          availability: 'Premium Plus members only',
        };
    }
  };

  const canUseBoost = (type: 'daily' | 'weekly' | 'premium') => {
    if (type === 'daily') return true;
    if (type === 'weekly') return subscription?.hasPremium || subscription?.hasPremiumPlus;
    if (type === 'premium') return subscription?.hasPremiumPlus;
    return false;
  };

  const isBoostAvailable = (type: 'daily' | 'weekly' | 'premium') => {
    if (!boostStatus) return false;
    
    if (boostStatus.hasActiveBoost) return false;
    
    if (type === 'daily') {
      return boostStatus.dailyBoostsUsed < boostStatus.dailyBoostsLimit;
    }
    
    return canUseBoost(type);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                🚀 Profile Boost
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Get more visibility and matches with profile boosts
              </p>
            </div>

            {boostStatus?.hasActiveBoost && (
              <Card className="mb-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <div className="text-center p-4">
                  <h3 className="font-semibold mb-1">✨ Boost Active</h3>
                  <p className="text-sm opacity-90">
                    Your profile is currently boosted
                  </p>
                  {boostStatus.expiresAt && (
                    <p className="text-xs opacity-75 mt-1">
                      Expires: {new Date(boostStatus.expiresAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </Card>
            )}

            <div className="space-y-4">
              {(['daily', 'weekly', 'premium'] as const).map((type) => {
                const boost = getBoostDescription(type);
                const available = isBoostAvailable(type);
                const hasAccess = canUseBoost(type);

                return (
                  <Card key={type} className={`p-4 ${!hasAccess ? 'opacity-60' : ''}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {boost.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {boost.description}
                        </p>
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                          <p>Duration: {boost.duration}</p>
                          <p>Availability: {boost.availability}</p>
                        </div>
                      </div>
                    </div>

                    {type === 'daily' && boostStatus && (
                      <div className="text-xs text-gray-500 dark:text-gray-500 mb-3">
                        Daily boosts used: {boostStatus.dailyBoostsUsed} / {boostStatus.dailyBoostsLimit}
                      </div>
                    )}

                    <Button
                      onClick={() => activateBoost(type)}
                      disabled={!available || loading || !hasAccess}
                      className={`w-full ${
                        hasAccess
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      {loading ? (
                        'Activating...'
                      ) : !hasAccess ? (
                        type === 'weekly' ? 'Upgrade to Premium' : 'Upgrade to Premium Plus'
                      ) : !available ? (
                        boostStatus?.hasActiveBoost ? 'Boost Active' : 'Limit Reached'
                      ) : (
                        `Activate ${boost.title}`
                      )}
                    </Button>
                  </Card>
                );
              })}
            </div>

            <div className="mt-6 text-center">
              <Button
                onClick={onClose}
                variant="outline"
                className="px-8"
              >
                Close
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export { ProfileBoost };