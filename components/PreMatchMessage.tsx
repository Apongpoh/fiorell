'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Button from './ui/Button';
import { Card } from './ui/Card';
import { useSubscription } from '../hooks/useSubscription';
import { apiRequest } from '../lib/api';

interface PreMatchMessageProps {
  recipientId: string;
  recipientName: string;
  onClose: () => void;
  onMessageSent?: () => void;
}

const PreMatchMessage: React.FC<PreMatchMessageProps> = ({
  recipientId,
  recipientName,
  onClose,
  onMessageSent,
}) => {
  const { subscription } = useSubscription();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const canSendPreMatchMessage = subscription?.hasPremiumPlus;
  const maxLength = 500;

  const sendMessage = async () => {
    if (!message.trim() || !canSendPreMatchMessage) return;

    setLoading(true);
    try {
      const response = await apiRequest('/api/messages/pre-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId,
          content: message.trim(),
        }),
      }) as Response;

      if (response.ok) {
        onMessageSent?.();
        onClose();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Failed to send pre-match message:', error);
      alert('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">💌</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            Message {recipientName}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Send a message before matching (Premium Plus feature)
          </p>
        </div>

        {!canSendPreMatchMessage ? (
          <Card className="mb-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            <div className="text-center p-4">
              <h3 className="font-semibold mb-2">🔒 Premium Plus Required</h3>
              <p className="text-sm opacity-90 mb-3">
                Upgrade to send messages before matching
              </p>
              <Button
                onClick={() => window.location.href = '/subscription'}
                className="bg-white text-purple-600 hover:bg-gray-100"
              >
                Upgrade Now
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your message
              </label>
              <textarea
                value={message}
                onChange={(e) => {
                  if (e.target.value.length <= maxLength) {
                    setMessage(e.target.value);
                  }
                }}
                placeholder="Write a thoughtful message to stand out..."
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={4}
                disabled={loading}
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500">
                  Be respectful and genuine to increase your chances
                </p>
                <p className={`text-xs ${
                  message.length > maxLength * 0.9 
                    ? 'text-red-500' 
                    : 'text-gray-500'
                }`}>
                  {message.length}/{maxLength}
                </p>
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
              <h4 className="font-medium text-purple-900 dark:text-purple-100 text-sm mb-1">
                💡 Tips for great first messages:
              </h4>
              <ul className="text-xs text-purple-700 dark:text-purple-300 space-y-1">
                <li>• Reference something from their profile</li>
                <li>• Ask a thoughtful question</li>
                <li>• Be genuine and authentic</li>
                <li>• Keep it conversational</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={sendMessage}
                disabled={!message.trim() || loading}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              >
                {loading ? 'Sending...' : 'Send Message'}
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export { PreMatchMessage };