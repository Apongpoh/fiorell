"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings as SettingsIcon,
  Shield,
  Globe,
  Bell,
  Mail,
  Database,
  Key,
  Users,
  ArrowLeft,
  Save,
  AlertTriangle,
  Loader2,
  CreditCard,
  Eye,
  EyeOff,
  Search,
  RefreshCw,
  Info,
  ExternalLink,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { useAuth, withAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/contexts/NotificationContext";

interface SystemSettings {
  general: {
    siteName: string;
    siteDescription: string;
    siteUrl: string;
    logoUrl: string;
    maintenanceMode: boolean;
    registrationEnabled: boolean;
    emailVerificationRequired: boolean;
    privacyMode: boolean;
  };
  security: {
    passwordMinLength: number;
    requireStrongPasswords: boolean;
    maxLoginAttempts: number;
    sessionTimeout: number;
    twoFactorRequired: boolean;
    bruteForceProtection: boolean;
    securityHeaders: boolean;
  };
  payments: {
    stripeEnabled: boolean;
    cryptoEnabled: boolean;
    supportedCryptos: string[];
    minimumPaymentAmount: number;
    paymentTimeout: number;
    refundsEnabled: boolean;
    subscriptionTrials: boolean;
  };
  notifications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    marketingEmails: boolean;
    adminAlerts: boolean;
    securityAlerts: boolean;
  };
}

function Settings() {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      const response = await fetch('/api/admin/settings', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        // Mock settings for demonstration
        setSettings({
          general: {
            siteName: "Fiorell Dating",
            siteDescription: "Find your perfect match with privacy-focused dating",
            siteUrl: "https://fiorell.dating",
            logoUrl: "/logo.png",
            maintenanceMode: false,
            registrationEnabled: true,
            emailVerificationRequired: true,
            privacyMode: true,
          },
          security: {
            passwordMinLength: 8,
            requireStrongPasswords: true,
            maxLoginAttempts: 5,
            sessionTimeout: 24,
            twoFactorRequired: false,
            bruteForceProtection: true,
            securityHeaders: true,
          },
          payments: {
            stripeEnabled: true,
            cryptoEnabled: true,
            supportedCryptos: ["bitcoin", "monero"],
            minimumPaymentAmount: 5.00,
            paymentTimeout: 15,
            refundsEnabled: true,
            subscriptionTrials: true,
          },
          notifications: {
            emailNotifications: true,
            pushNotifications: true,
            smsNotifications: false,
            marketingEmails: true,
            adminAlerts: true,
            securityAlerts: true,
          },
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      showNotification("Failed to load settings", "error");
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error("Failed to save settings");
      }

      showNotification("Settings saved successfully", "success");
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      showNotification("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (category: keyof SystemSettings, key: string, value: string | number | boolean) => {
    if (!settings) return;
    
    setSettings({
      ...settings,
      [category]: {
        ...settings[category],
        [key]: value,
      },
    });
    setHasUnsavedChanges(true);
  };

  const tabs = [
    { id: "general", label: "General", icon: Globe, color: "blue" },
    { id: "security", label: "Security", icon: Shield, color: "red" },
    { id: "payments", label: "Payments", icon: CreditCard, color: "yellow" },
    { id: "notifications", label: "Notifications", icon: Bell, color: "green" },
  ];

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        checked 
          ? 'bg-blue-600 focus:ring-blue-500' 
          : 'bg-gray-200 focus:ring-gray-500'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center bg-white p-8 rounded-2xl shadow-lg"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don&apos;t have permission to access admin settings.</p>
          <Link
            href="/admin"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Link>
        </motion.div>
      </div>
    );
  }

  const renderInput = ({ 
    label, 
    value, 
    onChange, 
    type = "text", 
    placeholder = "", 
    description = "",
    icon: Icon = null
  }: {
    label: string;
    value: string | number;
    onChange: (value: string | number) => void;
    type?: string;
    placeholder?: string;
    description?: string;
    icon?: React.ComponentType<{ className?: string }> | null;
  }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(type === "number" ? parseFloat(e.target.value) : e.target.value)}
          placeholder={placeholder}
          className={`block w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-3 border border-gray-300 rounded-xl text-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors`}
        />
      </div>
      {description && (
        <p className="text-xs text-gray-500 flex items-center">
          <Info className="h-3 w-3 mr-1" />
          {description}
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link 
                href="/admin" 
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Menu className="h-5 w-5 text-gray-600" />
              </button>
              
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <SettingsIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">System Settings</h1>
                <p className="text-sm text-gray-600 hidden sm:block">Configure platform settings and preferences</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-3">
              {hasUnsavedChanges && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="hidden sm:flex items-center text-sm text-amber-600"
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  <span className="hidden md:inline">Unsaved changes</span>
                </motion.div>
              )}
              
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                  showAdvanced 
                    ? 'bg-gray-900 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={showAdvanced ? "Hide Advanced" : "Show Advanced"}
              >
                {showAdvanced ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              
              <button
                onClick={loadSettings}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              
              <button
                onClick={saveSettings}
                disabled={saving || !hasUnsavedChanges}
                className={`inline-flex items-center px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  saving || !hasUnsavedChanges
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                }`}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 sm:mr-2" />
                )}
                <span className="hidden sm:inline">Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Mobile Tab Navigation */}
        <div className="lg:hidden mb-6">
          <div className="bg-white rounded-2xl shadow-sm p-2">
            <div className="flex space-x-1 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                    {hasUnsavedChanges && isActive && (
                      <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block w-72 bg-white rounded-2xl shadow-sm p-6 h-fit sticky top-8">
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search settings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      isActive 
                        ? 'bg-blue-100' 
                        : 'bg-gray-100'
                    }`}>
                      <Icon className={`h-4 w-4 ${
                        isActive 
                          ? 'text-blue-600' 
                          : 'text-gray-500'
                      }`} />
                    </div>
                    <span className="font-medium">{tab.label}</span>
                    {hasUnsavedChanges && isActive && (
                      <div className="w-2 h-2 bg-amber-400 rounded-full" />
                    )}
                  </motion.button>
                );
              })}
            </nav>

            {/* Quick Actions */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                  <Key className="h-4 w-4" />
                  <span>Reset API Keys</span>
                </button>
                <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                  <Database className="h-4 w-4" />
                  <span>Backup Settings</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Sidebar Overlay */}
          <AnimatePresence>
            {sidebarOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
                  onClick={() => setSidebarOpen(false)}
                />
                <motion.div
                  initial={{ x: -300 }}
                  animate={{ x: 0 }}
                  exit={{ x: -300 }}
                  className="lg:hidden fixed left-0 top-0 bottom-0 w-80 bg-white z-50 shadow-xl"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
                      <button
                        onClick={() => setSidebarOpen(false)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <X className="h-5 w-5 text-gray-600" />
                      </button>
                    </div>

                    {/* Mobile Search */}
                    <div className="relative mb-6">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search settings..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <nav className="space-y-2">
                      {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        
                        return (
                          <button
                            key={tab.id}
                            onClick={() => {
                              setActiveTab(tab.id);
                              setSidebarOpen(false);
                            }}
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                              isActive
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            <div className={`p-2 rounded-lg ${
                              isActive 
                                ? 'bg-blue-100' 
                                : 'bg-gray-100'
                            }`}>
                              <Icon className={`h-4 w-4 ${
                                isActive 
                                  ? 'text-blue-600' 
                                  : 'text-gray-500'
                              }`} />
                            </div>
                            <span className="font-medium">{tab.label}</span>
                            {hasUnsavedChanges && isActive && (
                              <div className="w-2 h-2 bg-amber-400 rounded-full" />
                            )}
                          </button>
                        );
                      })}
                    </nav>

                    {/* Mobile Quick Actions */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <h3 className="text-sm font-medium text-gray-900 mb-3">Quick Actions</h3>
                      <div className="space-y-2">
                        <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                          <Key className="h-4 w-4" />
                          <span>Reset API Keys</span>
                        </button>
                        <button className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                          <Database className="h-4 w-4" />
                          <span>Backup Settings</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Settings</h3>
                <p className="text-gray-600">Please wait while we fetch your configuration...</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-2xl shadow-sm p-8"
                >
                  {/* General Settings */}
                  {activeTab === "general" && (
                    <div className="space-y-8">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                          <Globe className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">General Settings</h2>
                          <p className="text-gray-600">Configure basic site information and behavior</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {renderInput({
                          label: "Site Name",
                          value: settings?.general.siteName || "",
                          onChange: (value) => updateSetting("general", "siteName", value),
                          placeholder: "Enter your site name",
                          description: "The name of your dating platform"
                        })}

                        {renderInput({
                          label: "Site URL",
                          value: settings?.general.siteUrl || "",
                          onChange: (value) => updateSetting("general", "siteUrl", value),
                          placeholder: "https://yourdomain.com",
                          description: "Your site's primary domain",
                          icon: ExternalLink
                        })}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Site Description
                        </label>
                        <textarea
                          value={settings?.general.siteDescription || ""}
                          onChange={(e) => updateSetting("general", "siteDescription", e.target.value)}
                          rows={3}
                          placeholder="Describe your dating platform..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                        />
                      </div>

                      <div className="bg-gray-50 rounded-xl p-4 sm:p-6 space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Platform Controls</h3>
                        
                        <div className="grid grid-cols-1 gap-4">
                          {[
                            {
                              key: "maintenanceMode",
                              label: "Maintenance Mode",
                              description: "Temporarily disable site access for maintenance",
                              icon: AlertTriangle
                            },
                            {
                              key: "registrationEnabled",
                              label: "Registration Enabled",
                              description: "Allow new users to create accounts",
                              icon: Users
                            },
                            {
                              key: "emailVerificationRequired",
                              label: "Email Verification",
                              description: "Require email verification for new accounts",
                              icon: Mail
                            },
                            {
                              key: "privacyMode",
                              label: "Privacy Mode",
                              description: "Enhanced privacy protections for users",
                              icon: Shield
                            }
                          ].map((control) => {
                            const Icon = control.icon;
                            return (
                              <div key={control.key} className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
                                <div className="flex items-center space-x-3 min-w-0 flex-1">
                                  <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                                    <Icon className="h-4 w-4 text-blue-600" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <label className="text-sm font-medium text-gray-900 block">{control.label}</label>
                                    <p className="text-xs text-gray-500 truncate sm:whitespace-normal">{control.description}</p>
                                  </div>
                                </div>
                                <div className="ml-3 flex-shrink-0">
                                  <Toggle
                                    checked={settings?.general[control.key as keyof typeof settings.general] as boolean || false}
                                    onChange={() => updateSetting("general", control.key, !settings?.general[control.key as keyof typeof settings.general])}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Security Settings */}
                  {activeTab === "security" && (
                    <div className="space-y-8">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                          <Shield className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900">Security Settings</h2>
                          <p className="text-gray-600">Configure authentication and security policies</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {renderInput({
                          label: "Password Min Length",
                          value: settings?.security.passwordMinLength || 8,
                          onChange: (value) => updateSetting("security", "passwordMinLength", value),
                          type: "number",
                          description: "Minimum required password length"
                        })}

                        {renderInput({
                          label: "Max Login Attempts",
                          value: settings?.security.maxLoginAttempts || 5,
                          onChange: (value) => updateSetting("security", "maxLoginAttempts", value),
                          type: "number",
                          description: "Failed attempts before account lockout"
                        })}

                        {renderInput({
                          label: "Session Timeout (hours)",
                          value: settings?.security.sessionTimeout || 24,
                          onChange: (value) => updateSetting("security", "sessionTimeout", value),
                          type: "number",
                          description: "Automatic logout after inactivity"
                        })}
                      </div>

                      <div className="bg-red-50 rounded-xl p-4 sm:p-6 space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900">Security Features</h3>
                        
                        <div className="grid grid-cols-1 gap-4">
                          {[
                            {
                              key: "requireStrongPasswords",
                              label: "Strong Password Policy",
                              description: "Enforce complex password requirements"
                            },
                            {
                              key: "twoFactorRequired",
                              label: "Mandatory 2FA",
                              description: "Require two-factor authentication for all users"
                            },
                            {
                              key: "bruteForceProtection",
                              label: "Brute Force Protection",
                              description: "Automatically block suspicious login attempts"
                            },
                            {
                              key: "securityHeaders",
                              label: "Security Headers",
                              description: "Enable additional HTTP security headers"
                            }
                          ].map((feature) => (
                            <div key={feature.key} className="flex items-center justify-between bg-white p-4 rounded-lg border border-red-200">
                              <div className="min-w-0 flex-1">
                                <label className="text-sm font-medium text-gray-900 block">{feature.label}</label>
                                <p className="text-xs text-gray-500 truncate sm:whitespace-normal">{feature.description}</p>
                              </div>
                              <div className="ml-3 flex-shrink-0">
                                <Toggle
                                  checked={settings?.security[feature.key as keyof typeof settings.security] as boolean || false}
                                  onChange={() => updateSetting("security", feature.key, !settings?.security[feature.key as keyof typeof settings.security])}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Other tabs placeholder */}
                  {(activeTab === "payments" || activeTab === "notifications") && (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        {tabs.find(t => t.id === activeTab)?.icon && 
                          (() => {
                            const Icon = tabs.find(t => t.id === activeTab)!.icon;
                            return <Icon className="h-8 w-8 text-gray-400" />;
                          })()
                        }
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {tabs.find(t => t.id === activeTab)?.label} Settings
                      </h3>
                      <p className="text-gray-600 mb-6">
                        This section will be enhanced with complete configuration options.
                      </p>
                      <button
                        onClick={() => setActiveTab("general")}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Go to General Settings
                      </button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default withAuth(Settings);
