"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Heart,
  MessageCircle,
  Shield,
  ArrowLeft,
  Loader2,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { useAuth, withAuth } from "@/contexts/AuthContext";
import { useNotification } from "@/contexts/NotificationContext";

interface ChartDataPoint {
  date: string;
  value: number;
}

interface AnalyticsData {
  period: string;
  overview: {
    totalUsers: number;
    newUsers: number;
    activeUsers: number;
    totalMatches: number;
    newMatches: number;
    totalMessages: number;
    newMessages: number;
    totalLikes: number;
    newLikes: number;
    totalReports: number;
    newReports: number;
  };
  growth: {
    users: number;
    matches: number;
    messages: number;
    likes: number;
  };
  charts: {
    userGrowth: ChartDataPoint[];
    matches: ChartDataPoint[];
    messages: ChartDataPoint[];
    likes: ChartDataPoint[];
  };
}

function Analytics() {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("fiorell_auth_token");
      
      const response = await fetch(`/api/admin/analytics?period=${period}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch analytics");
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error("Error loading analytics:", error);
      showNotification("Failed to load analytics", "error");
    } finally {
      setLoading(false);
    }
  }, [period, showNotification]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatPercentage = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}%`;
  };

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
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
              <BarChart3 className="h-6 w-6 text-purple-500" />
              <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
            <Loader2 className="h-12 w-12 text-purple-500 animate-spin" />
          </div>
        ) : analytics ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Users</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(analytics.overview.totalUsers)}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
                <div className="mt-4 flex items-center">
                  {analytics.growth.users >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm font-medium ${analytics.growth.users >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(analytics.growth.users)}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">vs last period</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Matches</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(analytics.overview.totalMatches)}
                    </p>
                  </div>
                  <Heart className="h-8 w-8 text-pink-500" />
                </div>
                <div className="mt-4 flex items-center">
                  {analytics.growth.matches >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm font-medium ${analytics.growth.matches >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(analytics.growth.matches)}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">vs last period</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Messages</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(analytics.overview.totalMessages)}
                    </p>
                  </div>
                  <MessageCircle className="h-8 w-8 text-green-500" />
                </div>
                <div className="mt-4 flex items-center">
                  {analytics.growth.messages >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm font-medium ${analytics.growth.messages >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(analytics.growth.messages)}
                  </span>
                  <span className="text-sm text-gray-500 ml-2">vs last period</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Reports</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {analytics.overview.totalReports}
                    </p>
                  </div>
                  <Shield className="h-8 w-8 text-red-500" />
                </div>
                <div className="mt-4 flex items-center">
                  <Activity className="h-4 w-4 text-gray-500 mr-1" />
                  <span className="text-sm text-gray-600 font-medium">
                    {analytics.overview.newReports} new
                  </span>
                  <span className="text-sm text-gray-500 ml-2">this period</span>
                </div>
              </div>
            </div>

            {/* Activity Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Users className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="font-medium text-gray-900">New Users</p>
                        <p className="text-sm text-gray-600">Last {analytics.period}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">
                        {formatNumber(analytics.overview.newUsers)}
                      </p>
                      <p className="text-sm text-gray-600">registered</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-pink-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Heart className="h-8 w-8 text-pink-500" />
                      <div>
                        <p className="font-medium text-gray-900">New Matches</p>
                        <p className="text-sm text-gray-600">Last {analytics.period}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-pink-600">
                        {formatNumber(analytics.overview.newMatches)}
                      </p>
                      <p className="text-sm text-gray-600">created</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <MessageCircle className="h-8 w-8 text-green-500" />
                      <div>
                        <p className="font-medium text-gray-900">New Messages</p>
                        <p className="text-sm text-gray-600">Last {analytics.period}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        {formatNumber(analytics.overview.newMessages)}
                      </p>
                      <p className="text-sm text-gray-600">sent</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Health</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600">Active Users</span>
                      <span className="text-sm font-bold text-gray-900">
                        {formatNumber(analytics.overview.activeUsers)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                        style={{ 
                          width: `${Math.min(100, (analytics.overview.activeUsers / analytics.overview.totalUsers) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {((analytics.overview.activeUsers / analytics.overview.totalUsers) * 100).toFixed(1)}% of total users
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600">Engagement Rate</span>
                      <span className="text-sm font-bold text-gray-900">
                        {analytics.overview.totalMessages > 0 ? 
                          ((analytics.overview.totalMessages / analytics.overview.totalUsers) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                        style={{ 
                          width: `${Math.min(100, analytics.overview.totalMessages > 0 ? 
                            (analytics.overview.totalMessages / analytics.overview.totalUsers) * 10 : 0)}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Messages per user ratio
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-600">Match Success Rate</span>
                      <span className="text-sm font-bold text-gray-900">
                        {analytics.overview.totalLikes > 0 ? 
                          ((analytics.overview.totalMatches / analytics.overview.totalLikes) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-pink-500 h-2 rounded-full transition-all duration-300" 
                        style={{ 
                          width: `${Math.min(100, analytics.overview.totalLikes > 0 ? 
                            (analytics.overview.totalMatches / analytics.overview.totalLikes) * 100 : 0)}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Matches from total likes
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Growth Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">User Growth Trend</h3>
                <div className="h-64 flex items-end justify-between space-x-2">
                  {analytics.charts.userGrowth.slice(-14).map((day: ChartDataPoint, index: number) => {
                    const maxValue = Math.max(...analytics.charts.userGrowth.map((d: ChartDataPoint) => d.value));
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div className="w-full bg-blue-200 rounded-t-sm relative min-h-[4px]">
                          <div
                            className="w-full bg-blue-500 rounded-t-sm transition-all duration-300"
                            style={{
                              height: `${Math.max(4, maxValue > 0 ? (day.value / maxValue) * 240 : 0)}px`
                            }}
                            title={`${day.date}: ${day.value} new users`}
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

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Matches Over Time</h3>
                <div className="h-64 flex items-end justify-between space-x-2">
                  {analytics.charts.matches.slice(-14).map((day: ChartDataPoint, index: number) => {
                    const maxValue = Math.max(...analytics.charts.matches.map((d: ChartDataPoint) => d.value));
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div className="w-full bg-pink-200 rounded-t-sm relative min-h-[4px]">
                          <div
                            className="w-full bg-pink-500 rounded-t-sm transition-all duration-300"
                            style={{
                              height: `${Math.max(4, maxValue > 0 ? (day.value / maxValue) * 240 : 0)}px`
                            }}
                            title={`${day.date}: ${day.value} matches`}
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

            {/* Message Activity */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Message Activity</h3>
              <div className="h-48 flex items-end justify-between space-x-1">
                {analytics.charts.messages.slice(-30).map((day: ChartDataPoint, index: number) => {
                  const maxValue = Math.max(...analytics.charts.messages.map((d: ChartDataPoint) => d.value));
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-green-500 rounded-t-sm transition-all duration-300 min-h-[2px]"
                        style={{
                          height: `${Math.max(2, maxValue > 0 ? (day.value / maxValue) * 180 : 0)}px`
                        }}
                        title={`${day.date}: ${day.value} messages`}
                      ></div>
                      {index % 5 === 0 && (
                        <p className="text-xs text-gray-600 mt-1 transform -rotate-45 origin-top-left">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Engagement Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Active Users</h3>
                  <Activity className="h-6 w-6 text-blue-500" />
                </div>
                <p className="text-3xl font-bold text-blue-600">
                  {formatNumber(analytics.overview.activeUsers)}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  {((analytics.overview.activeUsers / analytics.overview.totalUsers) * 100).toFixed(1)}% of total
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">New Likes</h3>
                  <Heart className="h-6 w-6 text-pink-500" />
                </div>
                <p className="text-3xl font-bold text-pink-600">
                  {formatNumber(analytics.overview.newLikes)}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  This {analytics.period}
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Safety Reports</h3>
                  <Shield className="h-6 w-6 text-red-500" />
                </div>
                <p className="text-3xl font-bold text-red-600">
                  {analytics.overview.newReports}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  Needs attention
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-600">Unable to load analytics data.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default withAuth(Analytics);