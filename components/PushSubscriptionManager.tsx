'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff } from 'lucide-react';

interface PushSubscriptionManagerProps {
  phone: string;
  onSubscriptionChange?: (subscribed: boolean) => void;
}

export default function PushSubscriptionManager({
  phone,
  onSubscriptionChange,
}: PushSubscriptionManagerProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if push notifications are supported
    const supported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    setIsSupported(supported);

    if (supported) {
      // Check current permission
      setPermission(Notification.permission);
      
      // Check if already subscribed
      checkSubscriptionStatus();
    }
  }, [phone]);

  const checkSubscriptionStatus = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        setIsSubscribed(true);
        onSubscriptionChange?.(true);
      } else {
        setIsSubscribed(false);
        onSubscriptionChange?.(false);
      }
    } catch (err) {
      console.error('[Push] Error checking subscription:', err);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      setError('Notifications are not supported in this browser');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      setError('Notification permission was denied. Please enable it in your browser settings.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);
      
      if (permission === 'granted') {
        return true;
      } else if (permission === 'denied') {
        setError('Notification permission was denied.');
        return false;
      }
      return false;
    } catch (err) {
      console.error('[Push] Error requesting permission:', err);
      setError('Failed to request notification permission');
      return false;
    }
  };

  const subscribe = async () => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Request permission first
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        setLoading(false);
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Get VAPID public key from API
      const vapidResponse = await fetch('/api/customer/push/vapid-key');
      if (!vapidResponse.ok) {
        throw new Error('Failed to get VAPID public key');
      }
      const vapidData = await vapidResponse.json();
      const vapidPublicKey = vapidData.publicKey;
      
      if (!vapidPublicKey) {
        throw new Error('VAPID public key is not configured');
      }

      // Convert VAPID key to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      // Subscribe to push service
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as any, // Type assertion for PushSubscriptionOptions
      });

      // Send subscription to server
      const response = await fetch('/api/customer/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
              auth: arrayBufferToBase64(subscription.getKey('auth')!),
            },
            expirationTime: subscription.expirationTime,
          },
          phone,
          userAgent: navigator.userAgent,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save subscription');
      }

      setIsSubscribed(true);
      onSubscriptionChange?.(true);
    } catch (err: any) {
      console.error('[Push] Subscription error:', err);
      setError(err.message || 'Failed to enable push notifications');
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push service
        await subscription.unsubscribe();

        // Remove from server
        await fetch('/api/customer/push/subscribe?endpoint=' + encodeURIComponent(subscription.endpoint), {
          method: 'DELETE',
        });
      }

      setIsSubscribed(false);
      onSubscriptionChange?.(false);
    } catch (err: any) {
      console.error('[Push] Unsubscription error:', err);
      setError(err.message || 'Failed to disable push notifications');
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return null; // Don't show anything if not supported
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
      )}

      {isSubscribed ? (
        <button
          onClick={unsubscribe}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
        >
          <BellOff className="w-5 h-5" />
          <span>{loading ? 'Disabling...' : 'Disable Notifications'}</span>
        </button>
      ) : (
        <button
          onClick={subscribe}
          disabled={loading || permission === 'denied'}
          className="flex items-center gap-2 px-4 py-2 bg-[#FF701A] hover:bg-[#ff8c42] text-white rounded-lg transition-colors disabled:opacity-50"
        >
          <Bell className="w-5 h-5" />
          <span>
            {loading
              ? 'Enabling...'
              : permission === 'denied'
              ? 'Permission Denied'
              : 'Enable Notifications'}
          </span>
        </button>
      )}
    </div>
  );
}

// Helper functions
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

