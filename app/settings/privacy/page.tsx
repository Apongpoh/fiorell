"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  ArrowLeft, 
  Shield, 
  Eye,
  EyeOff,
  Lock,
  UserX,
  AlertTriangle,
  MapPin,
  Calendar,
  Users,
  Settings
} from "lucide-react";
import Link from "next/link";

interface PrivacySetting {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
  type: 'toggle' | 'select';
  options?: string[];
  selectedOption?: string;
}

export default function PrivacySettings() {
  const [settings, setSettings] = useState<PrivacySetting[]>([
    {
      id: "profile_visibility",
      title: "Profile Visibility",
      description: "Control who can see your profile",
      icon: Eye,
      enabled: true,
      type: "select",
      options: ["Everyone", "Mutual connections only", "Hidden"],
      selectedOption: "Everyone"
    },
    {
      id: "location_sharing",
      title: "Location Sharing",
      description: "Show your location to potential matches",
      icon: MapPin,
      enabled: true,
      type: "toggle"
    },
    {
      id: "age_visibility",
      title: "Show Age",
      description: "Display your age on your profile",
      icon: Calendar,
      enabled: true,
      type: "toggle"
    },
    {
      id: "online_status",
      title: "Online Status",
      description: "Show when you're active on the app",
      icon: Users,
      enabled: false,
      type: "toggle"
    },
    {
      id: "read_receipts",
      title: "Read Receipts",
      description: "Let others know when you've read their messages",
      icon: Eye,
      enabled: true,
      type: "toggle"
    }
  ]);

  const [blockedUsers] = useState([
    { id: 1, name: "John Smith", photo: "/api/placeholder/50/50" },
    { id: 2, name: "Mike Johnson", photo: "/api/placeholder/50/50" }
  ]);

  const toggleSetting = (id: string) => {
    setSettings(prev => 
      prev.map(setting => 
        setting.id === id 
          ? { ...setting, enabled: !setting.enabled }
          : setting
      )
    );
  };

  const updateSelectSetting = (id: string, value: string) => {
    setSettings(prev => 
      prev.map(setting => 
        setting.id === id 
          ? { ...setting, selectedOption: value }
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
            <Shield className="h-6 w-6 text-pink-500" />
            <span className="text-xl font-bold text-gray-900">Privacy & Safety</span>
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
          {/* Privacy Settings */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 pb-4">
              <h2 className="text-lg font-semibold text-gray-900">Privacy Settings</h2>
              <p className="text-gray-600 text-sm mt-1">
                Control what information you share and who can see it
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {settings.map((setting) => (
                <div key={setting.id} className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <setting.icon className="h-5 w-5 text-blue-500" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{setting.title}</h3>
                        {setting.type === 'toggle' && (
                          <ToggleSwitch
                            enabled={setting.enabled}
                            onToggle={() => toggleSetting(setting.id)}
                          />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{setting.description}</p>
                      
                      {setting.type === 'select' && setting.options && (
                        <select
                          value={setting.selectedOption}
                          onChange={(e) => updateSelectSetting(setting.id, e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                        >
                          {setting.options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Blocked Users */}
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="p-6 pb-4">
              <h2 className="text-lg font-semibold text-gray-900">Blocked Users</h2>
              <p className="text-gray-600 text-sm mt-1">
                Manage users you've blocked from contacting you
              </p>
            </div>

            {blockedUsers.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {blockedUsers.map((user) => (
                  <div key={user.id} className="p-6 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src={user.photo}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <span className="font-medium text-gray-900">{user.name}</span>
                    </div>
                    <button className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <UserX className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No blocked users</p>
              </div>
            )}
          </div>

          {/* Safety Tips */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Safety Tips</h2>
            </div>
            
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-pink-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Never share personal information like your address, financial details, or social security number.</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-pink-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Meet in public places for your first few dates and let someone know where you're going.</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-pink-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Trust your instincts. If something feels wrong, don't hesitate to report or block the user.</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-pink-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>Be cautious of users who immediately want to move conversations off the platform.</p>
              </div>
            </div>
          </div>

          {/* Report & Support */}
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="p-6 pb-4">
              <h2 className="text-lg font-semibold text-gray-900">Report & Support</h2>
            </div>
            
            <div className="divide-y divide-gray-100">
              <Link href="/report" className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors">
                <span className="text-gray-900">Report a User</span>
                <ArrowLeft className="h-5 w-5 text-gray-400 rotate-180" />
              </Link>
              
              <Link href="/safety-center" className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors">
                <span className="text-gray-900">Safety Center</span>
                <ArrowLeft className="h-5 w-5 text-gray-400 rotate-180" />
              </Link>
              
              <Link href="/support" className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors">
                <span className="text-gray-900">Contact Support</span>
                <ArrowLeft className="h-5 w-5 text-gray-400 rotate-180" />
              </Link>
            </div>
          </div>

          {/* Save Button */}
          <button className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all">
            Save Privacy Settings
          </button>
        </motion.div>
      </main>
    </div>
  );
}