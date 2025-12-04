'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Bell, BellOff, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PushSubscriptionManager from '@/components/PushSubscriptionManager';

interface NotificationPreferences {
  receiptAccepted: boolean;
  receiptRejected: boolean;
  rewardMilestone: boolean;
  rewardAvailable: boolean;
  visitPeriodReminder: boolean;
  periodReset: boolean;
  manualReviewComplete: boolean;
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [phone, setPhone] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    receiptAccepted: true,
    receiptRejected: true,
    rewardMilestone: true,
    rewardAvailable: true,
    visitPeriodReminder: true,
    periodReset: true,
    manualReviewComplete: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const customerPhone = localStorage.getItem('customerPhone') || localStorage.getItem('customer_phone');
    if (!customerPhone) {
      router.push('/customer-auth');
      return;
    }
    setPhone(customerPhone);
    fetchPreferences(customerPhone);
  }, [router]);

  const fetchPreferences = async (customerPhone: string) => {
    try {
      const response = await fetch(`/api/customer/push/preferences?phone=${encodeURIComponent(customerPhone)}`);
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    if (!phone) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/customer/push/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          ...preferences,
        }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Notification preferences saved successfully!' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to save preferences' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#FF701A] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!phone) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20" style={{ backgroundColor: '#F4F4F4' }}>
      <div className="max-w-md mx-auto bg-white min-h-screen pb-20" style={{ maxWidth: '430px' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          <div className="w-10"></div>
        </div>

        <div className="px-6 pb-6 space-y-6">
          {/* Push Subscription Manager */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Push Notifications</h2>
            <p className="text-sm text-gray-600 mb-4">
              Enable push notifications to receive updates about your receipts and rewards.
            </p>
            <PushSubscriptionManager
              phone={phone}
              onSubscriptionChange={(subscribed) => {
                console.log('Push subscription changed:', subscribed);
              }}
            />
          </div>

          {/* Notification Preferences */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h2>
            <p className="text-sm text-gray-600 mb-4">
              Choose which notifications you want to receive.
            </p>

            <div className="space-y-3">
              {Object.entries(preferences).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <label
                      htmlFor={key}
                      className="text-sm font-medium text-gray-900 cursor-pointer"
                    >
                      {getNotificationLabel(key as keyof NotificationPreferences)}
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      {getNotificationDescription(key as keyof NotificationPreferences)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggle(key as keyof NotificationPreferences)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      value ? 'bg-[#FF701A]' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        value ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>

            {/* Message */}
            {message && (
              <div
                className={`mt-4 p-3 rounded-lg ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full mt-6 bg-[#FF701A] hover:bg-[#ff8c42] text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}

function getNotificationLabel(key: keyof NotificationPreferences): string {
  const labels: Record<keyof NotificationPreferences, string> = {
    receiptAccepted: 'Receipt Accepted',
    receiptRejected: 'Receipt Rejected',
    rewardMilestone: 'Reward Milestone',
    rewardAvailable: 'Reward Available',
    visitPeriodReminder: 'Visit Period Reminder',
    periodReset: 'Period Reset',
    manualReviewComplete: 'Manual Review Complete',
  };
  return labels[key];
}

function getNotificationDescription(key: keyof NotificationPreferences): string {
  const descriptions: Record<keyof NotificationPreferences, string> = {
    receiptAccepted: 'When your receipt is accepted and visit is counted',
    receiptRejected: 'When your receipt is rejected',
    rewardMilestone: 'When you reach a visit milestone',
    rewardAvailable: 'When a reward becomes available',
    visitPeriodReminder: 'Reminders about your visit period',
    periodReset: 'When your visit period resets',
    manualReviewComplete: 'When admin completes manual review',
  };
  return descriptions[key];
}


