"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Shield,
  Eye,
  UserX,
  AlertTriangle,
  MapPin,
  Calendar,
  Users,
  QrCode,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useNotification } from "@/contexts/NotificationContext";

interface PrivacySetting {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
  type: "toggle" | "select";
  options?: string[];
  selectedOption?: string;
}

export default function PrivacySettings() {
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<PrivacySetting[]>([
    {
      id: "profile_visibility",
      title: "Profile Visibility",
      description: "Control who can see your profile",
      icon: Eye,
      enabled: true,
      type: "select",
      options: ["Everyone", "Mutual connections only", "Hidden"],
      selectedOption: "Everyone",
    },
    {
      id: "location_sharing",
      title: "Location Sharing",
      description: "Show your location to potential matches",
      icon: MapPin,
      enabled: true,
      type: "toggle",
    },
    {
      id: "age_visibility",
      title: "Show Age",
      description: "Display your age on your profile",
      icon: Calendar,
      enabled: true,
      type: "toggle",
    },
    {
      id: "online_status",
      title: "Online Status",
      description: "Show when you're active on the app",
      icon: Users,
      enabled: false,
      type: "toggle",
    },
    {
      id: "read_receipts",
      title: "Read Receipts",
      description: "Let others know when you've read their messages",
      icon: Eye,
      enabled: true,
      type: "toggle",
    },
  ]);

  const [blockedUsers, setBlockedUsers] = useState<
    { id: string; name: string; photo: string }[]
  >([]);

  const [show2faModal, setShow2faModal] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Add refs for 2FA input boxes
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Focus first box when modal opens
  useEffect(() => {
    if (show2faModal) {
      const first = inputRefs.current[0];
      first?.focus();
      first?.select();
    }
  }, [show2faModal]);

  const mapVisibilityToOption = (v: "everyone" | "mutual" | "hidden") => {
    switch (v) {
      case "mutual":
        return "Mutual connections only";
      case "hidden":
        return "Hidden";
      default:
        return "Everyone";
    }
  };

  const mapOptionToVisibility = (
    o: string
  ): "everyone" | "mutual" | "hidden" => {
    if (o === "Mutual connections only") return "mutual";
    if (o === "Hidden") return "hidden";
    return "everyone";
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("fiorell_auth_token");
        // Load privacy settings
        const privacyResp = await fetch("/api/user/privacy", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (privacyResp.ok) {
          const pdata = await privacyResp.json();
          const p = pdata.privacy as {
            showAge?: boolean;
            showLocation?: boolean;
            onlineStatus?: boolean;
            readReceipts?: boolean;
            visibility?: "everyone" | "mutual" | "hidden";
          };
          setSettings((prev) =>
            prev.map((s) => {
              if (s.id === "age_visibility")
                return { ...s, enabled: p.showAge ?? s.enabled };
              if (s.id === "location_sharing")
                return { ...s, enabled: p.showLocation ?? s.enabled };
              if (s.id === "online_status")
                return { ...s, enabled: p.onlineStatus ?? s.enabled };
              if (s.id === "read_receipts")
                return { ...s, enabled: p.readReceipts ?? s.enabled };
              if (s.id === "profile_visibility")
                return {
                  ...s,
                  selectedOption: mapVisibilityToOption(
                    p.visibility ?? "everyone"
                  ),
                };
              return s;
            })
          );
        }
        // Load blocked users
        const blocksResp = await fetch("/api/user/blocks", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (blocksResp.ok) {
          const bdata = await blocksResp.json();
          setBlockedUsers(Array.isArray(bdata.blocked) ? bdata.blocked : []);
        }
      } catch {
        // non-fatal
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Load 2FA status on mount
  useEffect(() => {
    const load2fa = async () => {
      try {
        const token = localStorage.getItem("fiorell_auth_token");
        const resp = await fetch("/api/user/2fa/status", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (resp.ok) {
          const data = await resp.json();
          setTwoFAEnabled(!!data.enabled);
        }
      } catch {}
    };
    load2fa();
  }, []);

  const toggleSetting = (id: string) => {
    setSettings((prev) =>
      prev.map((setting) =>
        setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
      )
    );
  };

  const updateSelectSetting = (id: string, value: string) => {
    setSettings((prev) =>
      prev.map((setting) =>
        setting.id === id ? { ...setting, selectedOption: value } : setting
      )
    );
  };

  const saveSettings = async () => {
    try {
      const payload = {
        showAge: settings.find((s) => s.id === "age_visibility")?.enabled,
        showLocation: settings.find((s) => s.id === "location_sharing")
          ?.enabled,
        onlineStatus: settings.find((s) => s.id === "online_status")?.enabled,
        readReceipts: settings.find((s) => s.id === "read_receipts")?.enabled,
        visibility: mapOptionToVisibility(
          settings.find((s) => s.id === "profile_visibility")?.selectedOption ||
            "Everyone"
        ),
      };
      const resp = await fetch("/api/user/privacy", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("fiorell_auth_token")}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await resp.json();
      if (!resp.ok)
        throw new Error(data.error || "Failed to save privacy settings");
      showNotification("Privacy settings saved", "success");
    } catch (e: unknown) {
      const msg =
        typeof e === "object" && e && "message" in e
          ? (e as { message: string }).message
          : String(e);
      showNotification(msg || "Failed to save", "error");
    }
  };

  const unblockUser = async (targetUserId: string) => {
    try {
      const resp = await fetch(
        `/api/user/blocks?targetUserId=${encodeURIComponent(targetUserId)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem(
              "fiorell_auth_token"
            )}`,
          },
        }
      );
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Failed to unblock user");
      setBlockedUsers((prev) => prev.filter((u) => u.id !== targetUserId));
      showNotification("User unblocked", "success");
    } catch (e: unknown) {
      const msg =
        typeof e === "object" && e && "message" in e
          ? (e as { message: string }).message
          : String(e);
      showNotification(msg || "Failed to unblock", "error");
    }
  };

  // 2FA setup handler
  const handleEnable2fa = async () => {
    try {
      setShow2faModal(true);
      const token = localStorage.getItem("fiorell_auth_token");
      const resp = await fetch("/api/user/2fa/setup", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (resp.ok) {
        const data = await resp.json();
        setQrCodeUrl(data.qrCodeUrl);
        setSecretKey(data.secret);
      }
    } catch {
      showNotification("Failed to start 2FA setup", "error");
    }
  };

  // 2FA verify handler
  const handleVerify2fa = async () => {
    try {
      setVerifying(true);
      const token = localStorage.getItem("fiorell_auth_token");
      const resp = await fetch("/api/user/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ code: verificationCode }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Invalid code");
      setShow2faModal(false);
      setTwoFAEnabled(true);
      showNotification("Two-factor authentication enabled", "success");
    } catch (e: any) {
      showNotification(e.message || "Failed to verify 2FA", "error");
    } finally {
      setVerifying(false);
    }
  };

  // 2FA disable handler
  const handleDisable2fa = async () => {
    try {
      const token = localStorage.getItem("fiorell_auth_token");
      const resp = await fetch("/api/user/2fa/disable", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) throw new Error("Failed to disable 2FA");
      setTwoFAEnabled(false);
      showNotification("Two-factor authentication disabled", "success");
    } catch {
      showNotification("Failed to disable 2FA", "error");
    }
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

  // Simple Modal for 2FA
  function Modal({
    open,
    onClose,
    children,
  }: {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
  }) {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-lg p-6 max-w-md w-full relative">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
            aria-label="Close"
          >
            &times;
          </button>
          {children}
        </div>
      </div>
    );
  }

  // Helper: always work with 6-char array
  const codeArr = () => {
    const arr = verificationCode.split("").slice(0, 6);
    while (arr.length < 6) arr.push("");
    return arr;
  };

  // Helper: set code at index and move focus
  const handleDigitChange = (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    
    // Handle pasted content
    if (value.length > 1) {
      const digits = value.replace(/[^0-9]/g, "").slice(0, 6);
      setVerificationCode(digits.padEnd(6, ""));
      
      // Focus on the last filled position or next empty
      const focusIndex = Math.min(digits.length, 5);
      setTimeout(() => {
        inputRefs.current[focusIndex]?.focus();
      }, 0);
      return;
    }
    
    // Handle single digit input
    const digit = value.replace(/[^0-9]/g, "");
    const codeArray = verificationCode.padEnd(6, "").split("");
    
    if (digit) {
      codeArray[index] = digit;
      setVerificationCode(codeArray.join(""));
      
      // Move to next input
      if (index < 5) {
        setTimeout(() => {
          inputRefs.current[index + 1]?.focus();
        }, 0);
      }
    } else {
      // Clear current position
      codeArray[index] = "";
      setVerificationCode(codeArray.join(""));
    }
  };

  const handleDigitKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    const key = e.key;

    // Move left/right with arrows
    if (key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
      e.preventDefault();
      return;
    }
    if (key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
      e.preventDefault();
      return;
    }

    // Backspace behavior
    if (key === "Backspace") {
      e.preventDefault();
      const codeArray = verificationCode.padEnd(6, "").split("");
      
      if (codeArray[index]) {
        // Clear current digit
        codeArray[index] = "";
        setVerificationCode(codeArray.join(""));
      } else if (index > 0) {
        // Move to previous and clear it
        codeArray[index - 1] = "";
        setVerificationCode(codeArray.join(""));
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePasteCode = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
    if (!text) return;

    setVerificationCode(text.slice(0, 6).padEnd(6, ""));

    const lastFilledIndex = Math.min(text.length - 1, 5);
    setTimeout(() => {
      inputRefs.current[lastFilledIndex]?.focus();
    }, 0);
  };

  // Copy secret key to clipboard
  const copySecretKey = async () => {
    if (!secretKey) return;
    try {
      await navigator.clipboard.writeText(secretKey);
      showNotification("Secret key copied to clipboard", "success");
    } catch {
      showNotification("Failed to copy secret key", "error");
    }
  };

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
            <span className="text-xl font-bold text-gray-900">
              Privacy & Safety
            </span>
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
              <h2 className="text-lg font-semibold text-gray-900">
                Privacy Settings
              </h2>
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
                        <h3 className="font-medium text-gray-900">
                          {setting.title}
                        </h3>
                        {setting.type === "toggle" && (
                          <ToggleSwitch
                            enabled={setting.enabled}
                            onToggle={() => toggleSetting(setting.id)}
                          />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        {setting.description}
                      </p>

                      {setting.type === "select" && setting.options && (
                        <select
                          value={setting.selectedOption}
                          onChange={(e) =>
                            updateSelectSetting(setting.id, e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-sm"
                        >
                          {setting.options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      )}
                      {setting.id === "profile_visibility" && (
                        <div className="mt-2 text-xs text-gray-500 space-y-1">
                          <div>
                            <span className="font-medium text-gray-700">
                              Everyone:
                            </span>{" "}
                            Your profile appears in discovery.
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">
                              Mutual connections only:
                            </span>{" "}
                            Only users you&apos;ve matched with can see you.
                          </div>
                          <div>
                            <span className="font-medium text-gray-700">
                              Hidden:
                            </span>{" "}
                            You won&apos;t appear in discovery.
                          </div>
                        </div>
                      )}
                      {setting.id === "location_sharing" && (
                        <div className="mt-2 text-xs text-gray-500">
                          When off, your city won&apos;t be shown on your
                          profile.
                        </div>
                      )}
                      {setting.id === "age_visibility" && (
                        <div className="mt-2 text-xs text-gray-500">
                          When off, your age won’t be displayed.
                        </div>
                      )}
                      {setting.id === "online_status" && (
                        <div className="mt-2 text-xs text-gray-500">
                          When off, your “Last active” status won’t be shown.
                        </div>
                      )}
                      {setting.id === "read_receipts" && (
                        <div className="mt-2 text-xs text-gray-500">
                          When off, others won’t see read receipts for your
                          messages.
                        </div>
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
              <h2 className="text-lg font-semibold text-gray-900">
                Blocked Users
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Manage users you&apos;ve blocked from contacting you
              </p>
            </div>
            {blockedUsers.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {blockedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-6 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <Image
                        src={user.photo}
                        alt={user.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover"
                        priority
                      />
                      <span className="font-medium text-gray-900">
                        {user.name}
                      </span>
                    </div>
                    <button
                      onClick={() => unblockUser(user.id)}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
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
          {/* Safety Section with 2FA */}
          <div className="bg-white rounded-2xl shadow-sm mt-6">
            <div className="p-6 pb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Safety
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Enhance your account security and safety
              </p>
            </div>
            {/* 2FA Section */}
            <div className="p-6">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <QrCode className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">
                      Two-Factor Authentication
                    </h3>
                    {twoFAEnabled ? (
                      <button
                        onClick={handleDisable2fa}
                        className="px-3 py-1 text-sm text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Disable
                      </button>
                    ) : (
                      <button
                        onClick={handleEnable2fa}
                        className="px-3 py-1 text-sm text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        Enable
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Add an extra layer of security to your account using an authenticator app (Google Authenticator, Authy, etc).
                  </p>
                </div>
              </div>
            </div>
          </div>
          {/* 2FA Setup Modal */}
          {show2faModal && (
            <Modal open={show2faModal} onClose={() => setShow2faModal(false)}>
              <div className="p-6 max-w-md mx-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Set up Two-Factor Authentication</h3>
                <p className="text-gray-600 mb-4">Scan the QR code below with your authenticator app, then enter the 6-digit code to verify.</p>
                {qrCodeUrl ? (
                  <div className="text-center mb-4">
                    <div className="flex justify-center mb-4">
                      <img src={qrCodeUrl} alt="2FA QR Code" className="w-40 h-40" />
                    </div>
                    <p className="text-sm text-gray-600 mb-4">or enter this code manually:</p>
                    <div className="bg-gray-50 p-3 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <code className="text-sm font-mono text-gray-800">
                          {secretKey ? `${secretKey.slice(0, 8)}...${secretKey.slice(-4)}` : ''}
                        </code>
                        <button
                          onClick={copySecretKey}
                          className="ml-2 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors flex-shrink-0"
                          title="Copy full secret key"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 mb-4">Loading QR code...</div>
                )}
                {/* Six box input for 2FA code */}
                <div className="flex justify-between gap-2 mb-4">
                  {[0,1,2,3,4,5].map(i => (
                    <input
                      key={i}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      pattern="[0-9]"
                      className="w-10 h-12 text-center text-xl border border-gray-300 rounded-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-200"
                      value={verificationCode.charAt(i) || ""}
                      onChange={(e) => handleDigitChange(i, e)}
                      onKeyDown={(e) => handleDigitKeyDown(i, e)}
                      onPaste={handlePasteCode}
                      onFocus={(e) => { e.currentTarget.select(); }}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      id={`2fa-box-${i}`}
                      autoFocus={i === 0 && verificationCode.length === 0}
                    />
                  ))}
                </div>
                <button
                  onClick={handleVerify2fa}
                  disabled={verifying || !/^\d{6}$/.test(verificationCode)}
                  className="w-full px-4 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50"
                >
                  {verifying ? "Verifying..." : "Verify & Enable"}
                </button>
              </div>
            </Modal>
          )}
          {/* Safety Tips */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                Safety Tips
              </h2>
            </div>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-pink-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>
                  Never share personal information like your address, financial
                  details, or social security number.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-pink-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>
                  Meet in public places for your first few dates and let someone
                  know where you&apos;re going.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-pink-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>
                  Trust your instincts. If something feels wrong, don&apos;t
                  hesitate to report or block the user.
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-1.5 h-1.5 bg-pink-500 rounded-full mt-2 flex-shrink-0"></div>
                <p>
                  Be cautious of users who immediately want to move
                  conversations off the platform.
                </p>
              </div>
            </div>
          </div>
          {/* Report & Support */}
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="p-6 pb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Report & Support
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              <Link
                href="/report"
                className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-900">Report a User</span>
                <ArrowLeft className="h-5 w-5 text-gray-400 rotate-180" />
              </Link>
              <Link
                href="/safety-center"
                className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-900">Safety Center</span>
                <ArrowLeft className="h-5 w-5 text-gray-400 rotate-180" />
              </Link>
              <Link
                href="/support"
                className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-900">Contact Support</span>
                <ArrowLeft className="h-5 w-5 text-gray-400 rotate-180" />
              </Link>
            </div>
          </div>
          {/* Save Button */}
          <button
            onClick={saveSettings}
            disabled={loading}
            className="w-full px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50"
          >
            {loading ? "Loading..." : "Save Privacy Settings"}
          </button>
        </motion.div>
      </main>
    </div>
  );
}
