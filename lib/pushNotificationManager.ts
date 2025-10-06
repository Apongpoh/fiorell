"use client";

import { apiRequest } from "./api";

export class PushNotificationManager {
  private static instance: PushNotificationManager;
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;

  private constructor() {}

  static getInstance(): PushNotificationManager {
    if (!PushNotificationManager.instance) {
      PushNotificationManager.instance = new PushNotificationManager();
    }
    return PushNotificationManager.instance;
  }

  // Initialize push notifications
  async initialize(): Promise<boolean> {
    try {
      // Check if service workers are supported
      if (!('serviceWorker' in navigator)) {
        console.warn('Service workers not supported');
        return false;
      }

      // Check if push notifications are supported
      if (!('PushManager' in window)) {
        console.warn('Push messaging not supported');
        return false;
      }

      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service worker registered:', this.registration);

      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  // Request permission for push notifications
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    let permission = Notification.permission;

    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    return permission;
  }

  // Subscribe to push notifications
  async subscribe(): Promise<boolean> {
    try {
      if (!this.registration) {
        await this.initialize();
      }

      if (!this.registration) {
        throw new Error('Service worker not registered');
      }

      // Get permission
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        console.warn('Push notification permission denied');
        return false;
      }

      // Get VAPID public key
      const vapidResponse = await apiRequest('/push/vapid');
      const { publicKey } = vapidResponse as { publicKey: string };

      // Subscribe to push notifications
      this.subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlB64ToUint8Array(publicKey) as BufferSource
      });

      // Send subscription to server
      const token = localStorage.getItem('fiorell_auth_token');
      if (!token) {
        throw new Error('User not authenticated');
      }

      await apiRequest('/push/subscribe', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subscription: this.subscription.toJSON()
        })
      });

      console.log('Successfully subscribed to push notifications');
      return true;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return false;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe(): Promise<boolean> {
    try {
      if (!this.subscription) {
        return true; // Already unsubscribed
      }

      // Unsubscribe from browser
      await this.subscription.unsubscribe();

      // Remove subscription from server
      const token = localStorage.getItem('fiorell_auth_token');
      if (token) {
        await apiRequest('/push/subscribe', {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            endpoint: this.subscription.endpoint
          })
        });
      }

      this.subscription = null;
      console.log('Successfully unsubscribed from push notifications');
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  // Check if user is subscribed
  async isSubscribed(): Promise<boolean> {
    try {
      if (!this.registration) {
        return false;
      }

      this.subscription = await this.registration.pushManager.getSubscription();
      return this.subscription !== null;
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      return false;
    }
  }

  // Get current subscription
  async getSubscription(): Promise<PushSubscription | null> {
    try {
      if (!this.registration) {
        return null;
      }

      return await this.registration.pushManager.getSubscription();
    } catch (error) {
      console.error('Failed to get subscription:', error);
      return null;
    }
  }

  // Convert VAPID key from base64 to Uint8Array
  private urlB64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Show local notification (for testing)
  async showLocalNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        ...options
      });
    }
  }
}

// Export singleton instance
export const pushNotificationManager = PushNotificationManager.getInstance();