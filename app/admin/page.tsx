"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users,
  MessageCircle,
  DollarSign,
  TrendingUp,
  Shield,
  Settings,
  BarChart3,
  UserCheck,
  AlertTriangle,
  ArrowRight,
  Bitcoin,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

interface AdminStats {
  users: {
    total: number;
    activeToday: number;
    newThisWeek: number;
    growthRate: number;
  };
  engagement: {
    totalMatches: number;
    newMatchesThisWeek: number;
    messagesLastWeek: number;
    averageSessionTime: string;
    matchRate: number;
  };
  revenue: {
    totalRevenue: number;
    subscriptionsActive: number;
    conversionRate: number;
    monthlyRecurringRevenue: number;
  };
  support: {
    openTickets: number;
    avgResponseTime: string;
    satisfactionScore: number;
    ticketsResolvedThisWeek: number;
  };
  moderation: {
    openReports: number;
    reportsThisWeek: number;
    autoModeratedContent: number;
  };
  recentActivity: Array<{
    type: string;
    message: string;
    timestamp: string;
    icon: string;
  }>;
}

function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadStats = useCallback(async (isRefresh = false) => {
    // Don't load stats during SSR or before component is mounted
    if (!mounted || typeof window === "undefined") {
      return;
    }

    // Additional safety check for deployment environments
    if (!user || !user.isAdmin) {
      console.warn("Attempted to load admin stats without proper admin privileges");
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const token = localStorage.getItem("fiorell_auth_token");
      
      if (!token) {
        throw new Error("Authentication token not found");
      }
      
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorData.error || `Failed to fetch admin stats (${response.status})`);
      }

      const data = await response.json();
      setStats(data.stats);
    } catch (error: unknown) {
      console.error("Error loading admin stats:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load dashboard data";
      setError(errorMessage);
      
      // Fallback to empty state in case of error
      setStats({
        users: {
          total: 0,
          activeToday: 0,
          newThisWeek: 0,
          growthRate: 0,
        },
        engagement: {
          totalMatches: 0,
          newMatchesThisWeek: 0,
          messagesLastWeek: 0,
          averageSessionTime: "N/A",
          matchRate: 0,
        },
        revenue: {
          totalRevenue: 0,
          subscriptionsActive: 0,
          conversionRate: 0,
          monthlyRecurringRevenue: 0,
        },
        support: {
          openTickets: 0,
          avgResponseTime: "N/A",
          satisfactionScore: 0,
          ticketsResolvedThisWeek: 0,
        },
        moderation: {
          openReports: 0,
          reportsThisWeek: 0,
          autoModeratedContent: 0,
        },
        recentActivity: [],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mounted, user]);

  useEffect(() => {
    // Load admin stats only after component is mounted and user is verified
    if (mounted && user && user.isAdmin) {
      loadStats();
    }
  }, [user, loadStats, mounted]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Shield className="h-8 w-8 text-pink-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Admin Dashboard
                </h1>
                <p className="text-sm text-gray-600">
                  Welcome back, {user?.firstName}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => loadStats(true)}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:text-pink-600 transition-colors disabled:opacity-50"
                title="Refresh Dashboard"
              >
                <TrendingUp className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              <Link
                href="/dashboard"
                className="px-4 py-2 text-gray-600 hover:text-pink-600 transition-colors"
              >
                Back to App
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Error loading dashboard data</h3>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
              <button
                onClick={() => loadStats()}
                className="ml-auto px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center space-x-3">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.users.total.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Total Users</p>
                </div>
              </div>
              <div className="mt-3 flex items-center text-sm">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-green-600">
                  +{stats?.users.newThisWeek} this week
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center space-x-3">
                <MessageCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.engagement.totalMatches.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Total Matches</p>
                </div>
              </div>
              <div className="mt-3 flex items-center text-sm">
                <span className="text-gray-600">
                  {stats?.users.activeToday} active today
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center space-x-3">
                <DollarSign className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    ${stats?.revenue.totalRevenue.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                </div>
              </div>
              <div className="mt-3 flex items-center text-sm">
                <span className="text-gray-600">
                  {stats?.revenue.subscriptionsActive} active subscriptions
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.support.openTickets}
                  </p>
                  <p className="text-sm text-gray-600">Open Tickets</p>
                </div>
              </div>
              <div className="mt-3 flex items-center text-sm">
                <span className="text-gray-600">
                  Avg response: {stats?.support.avgResponseTime}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link href="/admin/verify-payments">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-xl p-6 shadow-sm cursor-pointer border-2 border-transparent hover:border-pink-200 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Bitcoin className="h-6 w-6 text-orange-500" />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Payment Verification
                      </h3>
                      <p className="text-sm text-gray-600">
                        Verify cryptocurrency payment proofs
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
                <div className="mt-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  NEW
                </div>
              </motion.div>
            </Link>

            <Link href="/admin/support">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-xl p-6 shadow-sm cursor-pointer border-2 border-transparent hover:border-pink-200 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <MessageCircle className="h-6 w-6 text-green-500" />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Support Center
                      </h3>
                      <p className="text-sm text-gray-600">
                        Manage customer support tickets
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
                {stats?.support.openTickets && stats.support.openTickets > 0 && (
                  <div className="mt-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    {stats.support.openTickets} pending
                  </div>
                )}
              </motion.div>
            </Link>

            <Link href="/admin/users">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-xl p-6 shadow-sm cursor-pointer border-2 border-transparent hover:border-pink-200 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Users className="h-6 w-6 text-blue-500" />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        User Management
                      </h3>
                      <p className="text-sm text-gray-600">
                        View and manage user accounts
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </motion.div>
            </Link>

            <Link href="/admin/analytics">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-xl p-6 shadow-sm cursor-pointer border-2 border-transparent hover:border-pink-200 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <BarChart3 className="h-6 w-6 text-purple-500" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Analytics</h3>
                      <p className="text-sm text-gray-600">
                        View detailed platform analytics
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </motion.div>
            </Link>

            <Link href="/admin/moderation">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-xl p-6 shadow-sm cursor-pointer border-2 border-transparent hover:border-pink-200 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <UserCheck className="h-6 w-6 text-emerald-500" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Moderation</h3>
                      <p className="text-sm text-gray-600">
                        Review flagged content and reports
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </motion.div>
            </Link>

            <Link href="/admin/revenue">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-xl p-6 shadow-sm cursor-pointer border-2 border-transparent hover:border-pink-200 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <DollarSign className="h-6 w-6 text-yellow-500" />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Revenue & Billing
                      </h3>
                      <p className="text-sm text-gray-600">
                        Manage subscriptions and payments
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </motion.div>
            </Link>

            <Link href="/admin/settings">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-white rounded-xl p-6 shadow-sm cursor-pointer border-2 border-transparent hover:border-pink-200 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Settings className="h-6 w-6 text-gray-500" />
                    <div>
                      <h3 className="font-semibold text-gray-900">Settings</h3>
                      <p className="text-sm text-gray-600">
                        Platform configuration and settings
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </motion.div>
            </Link>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Activity
            </h3>
            <div className="space-y-3">
              {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                stats.recentActivity.map((activity, index) => {
                  const getIcon = (iconName: string) => {
                    switch (iconName) {
                      case 'user-plus':
                        return <Users className="h-5 w-5 text-blue-500" />;
                      case 'heart':
                        return <MessageCircle className="h-5 w-5 text-pink-500" />;
                      case 'check-circle':
                        return <UserCheck className="h-5 w-5 text-green-500" />;
                      default:
                        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
                    }
                  };

                  const timeAgo = (timestamp: string) => {
                    const now = new Date();
                    const time = new Date(timestamp);
                    const diffMs = now.getTime() - time.getTime();
                    const diffMins = Math.floor(diffMs / (1000 * 60));
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                    
                    if (diffMins < 60) {
                      return `${diffMins} minutes ago`;
                    } else if (diffHours < 24) {
                      return `${diffHours} hours ago`;
                    } else {
                      return time.toLocaleDateString();
                    }
                  };

                  return (
                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      {getIcon(activity.icon)}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.message}
                        </p>
                        <p className="text-xs text-gray-600">
                          {timeAgo(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <AlertTriangle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No recent activity</p>
                </div>
              )}
            </div>
          </div>

          {/* Additional Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Engagement</h3>
                <BarChart3 className="h-6 w-6 text-purple-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Match Rate</span>
                  <span className="text-sm font-medium">{stats?.engagement.matchRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">New Matches (Week)</span>
                  <span className="text-sm font-medium">{stats?.engagement.newMatchesThisWeek}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Avg Session</span>
                  <span className="text-sm font-medium">{stats?.engagement.averageSessionTime}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Growth</h3>
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Growth Rate</span>
                  <span className="text-sm font-medium text-green-600">+{stats?.users.growthRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Conversion Rate</span>
                  <span className="text-sm font-medium">{stats?.revenue.conversionRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">MRR</span>
                  <span className="text-sm font-medium">${stats?.revenue.monthlyRecurringRevenue}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Moderation</h3>
                <Shield className="h-6 w-6 text-orange-500" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Open Reports</span>
                  <span className="text-sm font-medium text-orange-600">{stats?.moderation.openReports}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Reports (Week)</span>
                  <span className="text-sm font-medium">{stats?.moderation.reportsThisWeek}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Support Rating</span>
                  <span className="text-sm font-medium">{stats?.support.satisfactionScore}/5</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

// Simple admin wrapper - check admin status in component instead of HOC
function AdminProtectedDashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect non-authenticated users
  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      if (typeof window !== 'undefined') {
        window.location.href = "/login";
      }
    }
  }, [isAuthenticated, isLoading, mounted]);

  // Redirect non-admin users
  useEffect(() => {
    if (mounted && !isLoading && isAuthenticated && user && !user.isAdmin) {
      if (typeof window !== 'undefined') {
        window.location.href = "/dashboard";
      }
    }
  }, [isAuthenticated, isLoading, mounted, user]);

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don&apos;t have admin permissions.</p>
        </div>
      </div>
    );
  }

  return <AdminDashboard />;
}

export default AdminProtectedDashboard;