"use client";

import { useState, useEffect } from "react";
import { userAPI, statsAPI, interactionsAPI } from "@/lib/api";

export default function TestPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  const loadUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await userAPI.getProfile();
      setCurrentUser(response.user);
      console.log('User loaded:', response.user);
    } catch (err: any) {
      setError(err.message);
      console.error('Error loading user:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!currentUser?.id) {
      setError('No user ID available');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const data = await statsAPI.getUserStats(currentUser.id);
      setStats(data);
      console.log('Stats loaded:', data);
    } catch (err: any) {
      setError(err.message);
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const testLike = async () => {
    if (!currentUser?.id) {
      setError('No user ID available');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      // Use a test target user ID
      const targetUserId = "68dea113bc91ba25d06ddcac";
      const response = await interactionsAPI.recordSwipe(currentUser.id, targetUserId, 'like');
      setTestResult('Like recorded successfully: ' + JSON.stringify(response));
      console.log('Like test result:', response);
      
      // Reload stats
      setTimeout(() => loadStats(), 1000);
    } catch (err: any) {
      setError(err.message);
      console.error('Error testing like:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication & Likes Test</h1>
        
        <div className="space-y-4">
          <button 
            onClick={loadUser}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load User Profile'}
          </button>
          
          <button 
            onClick={loadStats}
            disabled={loading || !currentUser}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load Stats'}
          </button>
          
          <button 
            onClick={testLike}
            disabled={loading || !currentUser}
            className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Like'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}

        {currentUser && (
          <div className="mt-6 p-4 bg-blue-100 rounded">
            <h3 className="font-bold">Current User:</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(currentUser, null, 2)}
            </pre>
          </div>
        )}

        {stats && (
          <div className="mt-6 p-4 bg-green-100 rounded">
            <h3 className="font-bold">Stats:</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(stats, null, 2)}
            </pre>
          </div>
        )}

        {testResult && (
          <div className="mt-6 p-4 bg-pink-100 rounded">
            <h3 className="font-bold">Test Result:</h3>
            <pre className="text-sm overflow-auto">
              {testResult}
            </pre>
          </div>
        )}

        <div className="mt-8 p-4 bg-gray-100 rounded">
          <h3 className="font-bold mb-2">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>First, make sure you're logged in (go to /login if needed)</li>
            <li>Click "Load User Profile" to get your user data</li>
            <li>Click "Load Stats" to see your current like/match counts</li>
            <li>Click "Test Like" to record a like and see if it persists</li>
            <li>Check browser console for detailed logs</li>
          </ol>
        </div>
      </div>
    </div>
  );
}