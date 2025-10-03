"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Bell, 
  Heart,
  MessageCircle,
  Users,
  Star,
  Volume2,
  Smartphone,
  Mail
} from "lucide-react";
import Link from "next/link";

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  push: boolean;
  email: boolean;
  sound: boolean;
}

export default function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSetting[]>([
    {
      id: "matches",
      title: "New Matches",
      description: "Get notified when someone likes you back",
      icon: Heart,
      push: true,
      email: true,
      sound: true,
    },
    {
      id: "messages",
      title: "New Messages",
      description: "Receive notifications for new messages",
      icon: MessageCircle,
      push: true,
      email: false,
      sound: true,
    },
    {
      id: "likes",
      title: "New Likes",
      description: "Know when someone likes your profile",
      icon: Star,
      push: true,
      email: false,
      sound: false,
    },
    {
      id: "views",
      title: "Profile Views",
      description: "See who viewed your profile",
      icon: Users,
      push: false,
      email: true,
      sound: false,
    },
  ]);

  const toggleSetting = (id: string, type: 'push' | 'email' | 'sound') => {
    setSettings(prev => 
      prev.map(setting => 
        setting.id === id 
          ? { ...setting, [type]: !setting[type] }
          : setting
      )
    );
  };

  const ToggleSwitch = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? 'bg-pink-500' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

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
            <Bell className="h-6 w-6 text-pink-500" />
            <span className="text-xl font-bold text-gray-900">Notifications</span>
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
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  setSettings(prev => prev.map(s => ({ ...s, push: true, email: true, sound: true })));
                }}
                className="p-4 border border-gray-200 rounded-lg hover:border-pink-300 hover:bg-pink-50 transition-colors text-center"
              >
                <Bell className="h-6 w-6 text-pink-500 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900">Enable All</span>
              </button>
              <button
                onClick={() => {
                  setSettings(prev => prev.map(s => ({ ...s, push: false, email: false, sound: false })));
                }}
                className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-center"
              >
                <Bell className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                <span className="text-sm font-medium text-gray-900">Disable All</span>
              </button>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 pb-4">
              <h2 className="text-lg font-semibold text-gray-900">Notification Types</h2>
              <p className="text-gray-600 text-sm mt-1">
                Choose how you want to be notified for different activities
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {settings.map((setting) => (
                <div key={setting.id} className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <setting.icon className="h-5 w-5 text-pink-500" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900">{setting.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{setting.description}</p>
                      
                      <div className="mt-4 space-y-3">
                        {/* Push Notifications */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Smartphone className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-700">Push Notifications</span>
                          </div>
                          <ToggleSwitch
                            enabled={setting.push}
                            onToggle={() => toggleSetting(setting.id, 'push')}
                          />
                        </div>
                        
                        {/* Email Notifications */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-700">Email Notifications</span>
                          </div>
                          <ToggleSwitch
                            enabled={setting.email}
                            onToggle={() => toggleSetting(setting.id, 'email')}
                          />
                        </div>
                        
                        {/* Sound */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Volume2 className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-700">Sound</span>
                          </div>
                          <ToggleSwitch
                            enabled={setting.sound}
                            onToggle={() => toggleSetting(setting.id, 'sound')}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quiet Hours</h2>
            <p className="text-gray-600 text-sm mb-4">
              Set hours when you don&apos;t want to receive notifications
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Enable Quiet Hours</span>
                <ToggleSwitch enabled={false} onToggle={() => {}} />
              </div>
              
              <div className="grid grid-cols-2 gap-4 opacity-50">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    defaultValue="22:00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    defaultValue="08:00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <button className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all">
            Save Preferences
          </button>
        </motion.div>
      </main>
    </div>
  );
}