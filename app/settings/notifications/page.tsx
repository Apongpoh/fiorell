"use client";

import { useState, useEffect } from "react";
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
  Mail,
  Loader2,
  BellRing,
  BellOff,
} from "lucide-react";
import Link from "next/link";
import { useNotification } from "@/contexts/NotificationContext";
import { apiRequest } from "@/lib/api";
import { pushNotificationManager } from "@/lib/pushNotificationManager";

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  push: boolean;
  email: boolean;
  sound: boolean;
}

interface NotificationPreference {
  push: boolean;
  email: boolean;
  sound: boolean;
}

interface QuietHours {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

interface NotificationSettings {
  matches?: NotificationPreference;
  messages?: NotificationPreference;
  likes?: NotificationPreference;
  views?: NotificationPreference;
  quietHours?: QuietHours;
  [key: string]: NotificationPreference | QuietHours | undefined;
}

export default function NotificationSettings() {
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false);
  const [quietHours, setQuietHours] = useState({
    startTime: "22:00",
    endTime: "08:00",
  });

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

  // Load notification preferences on component mount
  useEffect(() => {
    const loadNotificationSettings = async () => {
      try {
        const token = localStorage.getItem("fiorell_auth_token");
        if (!token) {
          showNotification(
            "Please log in to access notification settings",
            "error"
          );
          return;
        }

        // Load notification settings
        const response = (await apiRequest("/user/notifications", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })) as { settings?: NotificationSettings };

        if (response.settings) {
          const serverSettings = response.settings;

          // Update settings state with server data
          setSettings((prev) =>
            prev.map((setting) => {
              const settingData = serverSettings[setting.id] as
                | NotificationPreference
                | undefined;
              return {
                ...setting,
                push: settingData?.push ?? setting.push,
                email: settingData?.email ?? setting.email,
                sound: settingData?.sound ?? setting.sound,
              };
            })
          );

          // Update quiet hours
          if (serverSettings.quietHours) {
            setQuietHoursEnabled(serverSettings.quietHours.enabled);
            setQuietHours({
              startTime: serverSettings.quietHours.startTime,
              endTime: serverSettings.quietHours.endTime,
            });
          }
        }

        // Check push notification status
        await checkPushNotificationStatus();
      } catch (error: unknown) {
        console.error("Error loading notification settings:", error);
        showNotification("Failed to load notification settings", "error");
      } finally {
        setLoading(false);
      }
    };

    loadNotificationSettings();
  }, [showNotification]);

  // Check push notification status
  const checkPushNotificationStatus = async () => {
    try {
      await pushNotificationManager.initialize();
      const isSubscribed = await pushNotificationManager.isSubscribed();
      setPushEnabled(isSubscribed);
    } catch (error) {
      console.error("Error checking push notification status:", error);
    }
  };

  // Toggle push notifications
  const togglePushNotifications = async () => {
    try {
      setPushLoading(true);

      if (pushEnabled) {
        // Unsubscribe
        const success = await pushNotificationManager.unsubscribe();
        if (success) {
          setPushEnabled(false);
          showNotification("Push notifications disabled", "success");
        } else {
          showNotification("Failed to disable push notifications", "error");
        }
      } else {
        // Subscribe
        const success = await pushNotificationManager.subscribe();
        if (success) {
          setPushEnabled(true);
          showNotification("Push notifications enabled", "success");

          // Send test notification
          await pushNotificationManager.showLocalNotification(
            "Push notifications enabled!",
            {
              body: "You'll now receive push notifications from Fiorell",
              icon: "/favicon.svg",
            }
          );
        } else {
          showNotification("Failed to enable push notifications", "error");
        }
      }
    } catch (error) {
      console.error("Error toggling push notifications:", error);
      showNotification("Failed to toggle push notifications", "error");
    } finally {
      setPushLoading(false);
    }
  };

  // Save notification preferences
  const saveNotificationSettings = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("fiorell_auth_token");
      if (!token) {
        showNotification("Please log in to save settings", "error");
        return;
      }

      // Convert settings array to object format for API
      const settingsObject: Record<
        string,
        NotificationPreference | QuietHours
      > = settings.reduce((acc, setting) => {
        acc[setting.id] = {
          push: setting.push,
          email: setting.email,
          sound: setting.sound,
        };
        return acc;
      }, {} as Record<string, { push: boolean; email: boolean; sound: boolean }>);

      // Add quiet hours
      settingsObject.quietHours = {
        enabled: quietHoursEnabled,
        startTime: quietHours.startTime,
        endTime: quietHours.endTime,
      };

      const response = (await apiRequest("/user/notifications", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings: settingsObject }),
      })) as { settings?: NotificationSettings };

      // Update local state with saved settings to prevent reset
      if (response.settings) {
        const serverSettings = response.settings;

        // Update settings state with server data
        setSettings((prev) =>
          prev.map((setting) => {
            const settingData = serverSettings[setting.id] as
              | NotificationPreference
              | undefined;
            return {
              ...setting,
              push: settingData?.push ?? setting.push,
              email: settingData?.email ?? setting.email,
              sound: settingData?.sound ?? setting.sound,
            };
          })
        );

        // Update quiet hours
        if (serverSettings.quietHours) {
          setQuietHoursEnabled(serverSettings.quietHours.enabled);
          setQuietHours({
            startTime: serverSettings.quietHours.startTime,
            endTime: serverSettings.quietHours.endTime,
          });
        }
      }

      showNotification(
        "Notification preferences saved successfully",
        "success"
      );
    } catch (error: unknown) {
      console.error("Error saving notification settings:", error);
      showNotification("Failed to save notification settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = (id: string, type: "push" | "email" | "sound") => {
    setSettings((prev) =>
      prev.map((setting) =>
        setting.id === id ? { ...setting, [type]: !setting[type] } : setting
      )
    );
  };

  const ToggleSwitch = ({
    enabled,
    onToggle,
  }: {
    enabled: boolean;
    onToggle: () => void;
  }) => (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        enabled ? "bg-pink-500" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          enabled ? "translate-x-6" : "translate-x-1"
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
            <span className="text-xl font-bold text-gray-900">
              Notifications
            </span>
          </div>
          <div className="w-12"></div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
            <span className="ml-2 text-gray-600">
              Loading notification settings...
            </span>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Push Notification Settings */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border-l-4 border-pink-500">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                    {pushEnabled ? (
                      <BellRing className="h-5 w-5 text-pink-500" />
                    ) : (
                      <BellOff className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Push Notifications
                    </h2>
                    <p className="text-sm text-gray-600">
                      {pushEnabled
                        ? "Receive instant notifications on this device"
                        : "Enable to receive instant notifications"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={togglePushNotifications}
                  disabled={pushLoading}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    pushEnabled ? "bg-pink-500" : "bg-gray-300"
                  } ${pushLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {pushLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white mx-auto" />
                  ) : (
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        pushEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  )}
                </button>
              </div>

              {pushEnabled && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <BellRing className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800 font-medium">
                      Push notifications are active
                    </span>
                  </div>
                  <p className="text-xs text-green-700 mt-1">
                    You&apos;ll receive real-time notifications for matches,
                    messages, and more
                  </p>
                </div>
              )}

              {!pushEnabled && Notification?.permission === "denied" && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <BellOff className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-800 font-medium">
                      Notifications blocked
                    </span>
                  </div>
                  <p className="text-xs text-yellow-700 mt-1">
                    Please enable notifications in your browser settings to
                    receive push notifications
                  </p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Actions
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setSettings((prev) =>
                      prev.map((s) => ({
                        ...s,
                        push: true,
                        email: true,
                        sound: true,
                      }))
                    );
                  }}
                  className="p-4 border border-gray-200 rounded-lg hover:border-pink-300 hover:bg-pink-50 transition-colors text-center"
                >
                  <Bell className="h-6 w-6 text-pink-500 mx-auto mb-2" />
                  <span className="text-sm font-medium text-gray-900">
                    Enable All
                  </span>
                </button>
                <button
                  onClick={() => {
                    setSettings((prev) =>
                      prev.map((s) => ({
                        ...s,
                        push: false,
                        email: false,
                        sound: false,
                      }))
                    );
                  }}
                  className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-center"
                >
                  <Bell className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                  <span className="text-sm font-medium text-gray-900">
                    Disable All
                  </span>
                </button>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 pb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Notification Types
                </h2>
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
                        <h3 className="font-medium text-gray-900">
                          {setting.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {setting.description}
                        </p>

                        <div className="mt-4 space-y-3">
                          {/* Push Notifications */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Smartphone className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-700">
                                Push Notifications
                              </span>
                            </div>
                            <ToggleSwitch
                              enabled={setting.push}
                              onToggle={() => toggleSetting(setting.id, "push")}
                            />
                          </div>

                          {/* Email Notifications */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Mail className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-700">
                                Email Notifications
                              </span>
                            </div>
                            <ToggleSwitch
                              enabled={setting.email}
                              onToggle={() =>
                                toggleSetting(setting.id, "email")
                              }
                            />
                          </div>

                          {/* Sound */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Volume2 className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-700">
                                Sound
                              </span>
                            </div>
                            <ToggleSwitch
                              enabled={setting.sound}
                              onToggle={() =>
                                toggleSetting(setting.id, "sound")
                              }
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
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Quiet Hours
              </h2>
              <p className="text-gray-600 text-sm mb-4">
                Set hours when you don&apos;t want to receive notifications
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Enable Quiet Hours</span>
                  <ToggleSwitch
                    enabled={quietHoursEnabled}
                    onToggle={() => setQuietHoursEnabled(!quietHoursEnabled)}
                  />
                </div>

                <div
                  className={`grid grid-cols-2 gap-4 transition-opacity ${
                    !quietHoursEnabled ? "opacity-50" : ""
                  }`}
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={quietHours.startTime}
                      onChange={(e) =>
                        setQuietHours((prev) => ({
                          ...prev,
                          startTime: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      disabled={!quietHoursEnabled}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={quietHours.endTime}
                      onChange={(e) =>
                        setQuietHours((prev) => ({
                          ...prev,
                          endTime: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                      disabled={!quietHoursEnabled}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={saveNotificationSettings}
              disabled={saving}
              className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Preferences</span>
              )}
            </button>
          </motion.div>
        )}
      </main>
    </div>
  );
}
