"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import Link from "next/link";
import { useAuth, withAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface AdminStats {
  users: {
    total: number;
    activeToday: number;
    newThisWeek: number;
  };
  engagement: {
    totalMatches: number;
    messagesLastWeek: number;
    averageSessionTime: string;
  };
  revenue: {
    totalRevenue: number;
    subscriptionsActive: number;
    conversionRate: number;
  };
  support: {
    openTickets: number;
    avgResponseTime: string;
    satisfactionScore: number;
  };
}

function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Redirect if not admin
    if (user && !user.isAdmin) {
      router.push("/dashboard");
      return;
    }

    // Load admin stats
    loadStats();
  }, [user, router]);

  const loadStats = async () => {
    try {
      // This would be actual API calls in production
      setStats({
        users: {
          total: 1250,
          activeToday: 89,
          newThisWeek: 47,
        },
        engagement: {
          totalMatches: 3420,
          messagesLastWeek: 12800,
          averageSessionTime: "14m 32s",
        },
        revenue: {
          totalRevenue: 24750,
          subscriptionsActive: 156,
          conversionRate: 12.4,
        },
        support: {
          openTickets: 8,
          avgResponseTime: "2h 15m",
          satisfactionScore: 4.6,
        },
      });
    } catch (error) {
      console.error("Error loading admin stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || !user.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600">
            You don&apos;t have permission to access the admin dashboard.
          </p>
        </div>
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
                  Welcome back, {user.firstName}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
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
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Activity
            </h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <UserCheck className="h-5 w-5 text-green-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    New user verification completed
                  </p>
                  <p className="text-xs text-gray-600">2 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <MessageCircle className="h-5 w-5 text-blue-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Support ticket resolved
                  </p>
                  <p className="text-xs text-gray-600">15 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    Premium subscription purchased
                  </p>
                  <p className="text-xs text-gray-600">1 hour ago</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export default withAuth(AdminDashboard);