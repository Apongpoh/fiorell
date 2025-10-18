"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useAuth, withAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/contexts/NotificationContext";

interface RevenueData {
  period: string;
  overview: {
    totalRevenue: number;
    growth: number;
    averagePerUser: number;
    premiumUsers: number;
    conversionRate: number;
  };
  breakdown: {
    subscriptions: number;
    boosts: number;
    cryptocurrency: {
      bitcoin: number;
      monero: number;
    };
    lemonSqueezy: number;
  };
  charts: {
    daily: Array<{
      date: string;
      value: number;
    }>;
  };
  topUsers: Array<{
    id: string;
    name: string;
    email: string;
    revenue: number;
    joinDate: string;
  }>;
  paymentMethods: {
    lemonSqueezy: {
      revenue: number;
      count: number;
    };
    cryptocurrency: {
      revenue: number;
      count: number;
      bitcoin: number;
      monero: number;
    };
  };
}

function Revenue() {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("30d");

  const loadRevenueData = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("fiorell_auth_token");
      
      const response = await fetch(`/api/admin/revenue?period=${selectedPeriod}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch revenue data");
      }

      const data = await response.json();
      setRevenueData(data);
    } catch (error) {
      console.error("Error loading revenue data:", error);
      showNotification("Failed to load revenue data", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, showNotification]);

  useEffect(() => {
    loadRevenueData();
  }, [loadRevenueData]);

  const formatCurrency = (amount: number) => {
    if (!isFinite(amount) || isNaN(amount)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    if (!isFinite(value) || isNaN(value)) return '0.0%';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const calculatePercentage = (part: number, total: number) => {
    if (!total || total === 0 || !isFinite(part) || isNaN(part)) return 0;
    return (part / total) * 100;
  };

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Link href="/admin" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <DollarSign className="h-6 w-6 text-yellow-500" />
              <h1 className="text-xl font-bold text-gray-900">Revenue</h1>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="7d">7 days</option>
                <option value="30d">30 days</option>
                <option value="90d">90 days</option>
                <option value="1y">1 year</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-12 w-12 text-yellow-500 animate-spin" />
          </div>
        ) : revenueData ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Revenue Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(revenueData.overview.totalRevenue || 0)}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
                <div className="mt-4 flex items-center">
                  {revenueData.overview.growth >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm font-medium ${revenueData.overview.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(revenueData.overview.growth)}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">vs last period</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Premium Users</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {(revenueData.overview.premiumUsers || 0).toLocaleString()}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-600">
                    {formatPercentage(revenueData.overview.conversionRate || 0)} conversion rate
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Avg per User</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(revenueData.overview.averagePerUser || 0)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Crypto Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency((revenueData.breakdown.cryptocurrency.bitcoin || 0) + (revenueData.breakdown.cryptocurrency.monero || 0))}
                    </p>
                  </div>
                  <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    ₿
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Bitcoin: {formatCurrency(revenueData.breakdown.cryptocurrency.bitcoin || 0)}</span>
                    <span className="text-gray-600">Monero: {formatCurrency(revenueData.breakdown.cryptocurrency.monero || 0)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue Breakdown and Payment Methods */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Breakdown</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="h-8 w-8 text-yellow-500" />
                      <div>
                        <p className="font-medium text-gray-900">Subscriptions</p>
                        <p className="text-sm text-gray-600">Premium memberships</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-yellow-600">
                        {formatCurrency(revenueData.breakdown.subscriptions || 0)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatPercentage(calculatePercentage(revenueData.breakdown.subscriptions, revenueData.overview.totalRevenue))}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <TrendingUp className="h-8 w-8 text-purple-500" />
                      <div>
                        <p className="font-medium text-gray-900">Boosts</p>
                        <p className="text-sm text-gray-600">Profile visibility</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-purple-600">
                        {formatCurrency(revenueData.breakdown.boosts || 0)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatPercentage(calculatePercentage(revenueData.breakdown.boosts, revenueData.overview.totalRevenue))}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        ₿
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Cryptocurrency</p>
                        <p className="text-sm text-gray-600">Bitcoin & Monero payments</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-blue-600">
                        {formatCurrency((revenueData.breakdown.cryptocurrency.bitcoin || 0) + (revenueData.breakdown.cryptocurrency.monero || 0))}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatPercentage(calculatePercentage(revenueData.breakdown.cryptocurrency.bitcoin + revenueData.breakdown.cryptocurrency.monero, revenueData.overview.totalRevenue))}
                      </p>
                    </div>
                  </div>

                  {/* Crypto breakdown */}
                  <div className="ml-4 space-y-2">
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-orange-600 font-bold">₿</span>
                        <span className="text-sm font-medium text-gray-900">Bitcoin</span>
                      </div>
                      <span className="text-sm font-bold text-orange-600">
                        {formatCurrency(revenueData.breakdown.cryptocurrency.bitcoin || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600 font-bold">🔒</span>
                        <span className="text-sm font-medium text-gray-900">Monero</span>
                      </div>
                      <span className="text-sm font-bold text-gray-600">
                        {formatCurrency(revenueData.breakdown.cryptocurrency.monero || 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CreditCard className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="font-medium text-gray-900">Lemon Squeezy</p>
                        <p className="text-sm text-gray-600">{revenueData.paymentMethods.lemonSqueezy.count} payments</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">
                        {formatCurrency(revenueData.paymentMethods.lemonSqueezy.revenue || 0)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                        ₿
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Cryptocurrency</p>
                        <p className="text-sm text-gray-600">{revenueData.paymentMethods.cryptocurrency.count} payments</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-blue-600">
                        {formatCurrency(revenueData.paymentMethods.cryptocurrency.revenue || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
                <div className="h-64 flex items-end justify-between space-x-2">
                  {revenueData.charts.daily.slice(-14).map((day, index) => {
                    const dailyValues = revenueData.charts.daily.map(d => d.value || 0).filter(v => isFinite(v));
                    const maxValue = dailyValues.length > 0 ? Math.max(...dailyValues) : 1;
                    const dayValue = day.value || 0;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div className="w-full bg-yellow-200 rounded-t-sm relative min-h-[4px]">
                          <div
                            className="w-full bg-yellow-500 rounded-t-sm transition-all duration-300"
                            style={{
                              height: `${Math.max(4, maxValue > 0 ? (dayValue / maxValue) * 240 : 4)}px`
                            }}
                            title={`${day.date}: ${formatCurrency(dayValue)}`}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-600 mt-2 text-center">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Top Users */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Revenue Contributors</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Revenue
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Join Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {revenueData.topUsers.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-green-600">
                            {formatCurrency(user.revenue || 0)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.joinDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="text-center py-12">
            <DollarSign className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Revenue Data</h3>
            <p className="text-gray-600">Unable to load revenue information.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default withAuth(Revenue);
