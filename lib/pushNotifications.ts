import webpush from 'web-push';
import mongoose from 'mongoose';
import dbConnect from './db';
import PushSubscription from '@/models/PushSubscription';
import NotificationPreferences, { INotificationPreferences } from '@/models/NotificationPreferences';

// VAPID keys - should be in environment variables
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:contact@lewisretails.com';

// Configure web-push
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  data?: any;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

/**
 * Send push notification to a single customer
 */
export async function sendNotificationToCustomer(
  customerId: string | mongoose.Types.ObjectId,
  payload: NotificationPayload,
  notificationType: string
): Promise<boolean> {
  try {
    await dbConnect();

    // Check if customer has enabled this notification type
    const preferences = await NotificationPreferences.findOne({ customerId });
    if (preferences) {
      const preferenceMap: Record<string, keyof INotificationPreferences> = {
        receiptAccepted: 'receiptAccepted',
        receiptRejected: 'receiptRejected',
        rewardMilestone: 'rewardMilestone',
        rewardAvailable: 'rewardAvailable',
        visitPeriodReminder: 'visitPeriodReminder',
        periodReset: 'periodReset',
        manualReviewComplete: 'manualReviewComplete',
      };
      const preferenceKey = preferenceMap[notificationType];
      if (preferenceKey && preferences[preferenceKey] === false) {
        console.log(`[Push] Notification ${notificationType} disabled for customer ${customerId}`);
        return false;
      }
    }

    // Get active subscriptions for customer
    const subscriptions = await PushSubscription.find({
      customerId,
      isActive: true,
    });

    if (subscriptions.length === 0) {
      console.log(`[Push] No active subscriptions for customer ${customerId}`);
      return false;
    }

    // Prepare notification payload
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/Lewis_Retails_logo_2.png',
      badge: payload.badge || '/Lewis_Retails_logo_2.png',
      tag: payload.tag || notificationType,
      data: {
        url: payload.url || '/dashboard/customer',
        ...payload.data,
      },
      requireInteraction: payload.requireInteraction || false,
      actions: payload.actions || [],
    });

    // Send to all subscriptions
    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth,
            },
          },
          notificationPayload
        );
        console.log(`[Push] Notification sent successfully to ${subscription.endpoint.substring(0, 50)}...`);
        return true;
      } catch (error: any) {
        console.error(`[Push] Failed to send notification:`, error.message);

        // If subscription is invalid, mark it as inactive
        if (error.statusCode === 410 || error.statusCode === 404) {
          await PushSubscription.updateOne(
            { _id: subscription._id },
            { isActive: false }
          );
          console.log(`[Push] Marked subscription as inactive: ${subscription._id}`);
        }
        return false;
      }
    });

    const results = await Promise.all(sendPromises);
    return results.some((result) => result === true);
  } catch (error) {
    console.error('[Push] Error sending notification:', error);
    return false;
  }
}

/**
 * Send push notification by customer phone number
 */
export async function sendNotificationByPhone(
  phone: string,
  payload: NotificationPayload,
  notificationType: string
): Promise<boolean> {
  try {
    await dbConnect();

    // Check preferences by phone
    const preferences = await NotificationPreferences.findOne({ customerPhone: phone });
    if (preferences) {
      const preferenceKey = notificationType as keyof INotificationPreferences;
      if (preferences[preferenceKey] === false) {
        console.log(`[Push] Notification ${notificationType} disabled for phone ${phone}`);
        return false;
      }
    }

    // Get active subscriptions by phone
    const subscriptions = await PushSubscription.find({
      customerPhone: phone,
      isActive: true,
    });

    if (subscriptions.length === 0) {
      console.log(`[Push] No active subscriptions for phone ${phone}`);
      return false;
    }

    // Send to all subscriptions for this phone
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/Lewis_Retails_logo_2.png',
      badge: payload.badge || '/Lewis_Retails_logo_2.png',
      tag: payload.tag || notificationType,
      data: {
        url: payload.url || '/dashboard/customer',
        ...payload.data,
      },
      requireInteraction: payload.requireInteraction || false,
      actions: payload.actions || [],
    });

    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth,
            },
          },
          notificationPayload
        );
        return true;
      } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          await PushSubscription.updateOne(
            { _id: subscription._id },
            { isActive: false }
          );
        }
        return false;
      }
    });

    const results = await Promise.all(sendPromises);
    return results.some((result) => result === true);
  } catch (error) {
    console.error('[Push] Error sending notification by phone:', error);
    return false;
  }
}

/**
 * Notification scenario handlers
 */

export async function notifyReceiptAccepted(phone: string, receiptId: string, visitCount: number) {
  return sendNotificationByPhone(
    phone,
    {
      title: 'Receipt Accepted! 🎉',
      body: `Your visit has been counted. You're one step closer to your reward!`,
      tag: 'receipt-accepted',
      url: '/dashboard/customer/rewards',
      data: { receiptId, visitCount, type: 'receipt-accepted' },
      requireInteraction: false,
    },
    'receiptAccepted'
  );
}

export async function notifyReceiptRejected(phone: string, receiptId: string, reason: string) {
  return sendNotificationByPhone(
    phone,
    {
      title: 'Receipt Not Accepted',
      body: `We couldn't verify your receipt. ${reason || 'Please try again or contact support.'}`,
      tag: 'receipt-rejected',
      url: '/customer-receipt',
      data: { receiptId, reason, type: 'receipt-rejected' },
      requireInteraction: true,
      actions: [
        {
          action: 'retry',
          title: 'Try Again',
        },
      ],
    },
    'receiptRejected'
  );
}

export async function notifyRewardMilestone(phone: string, visitCount: number) {
  return sendNotificationByPhone(
    phone,
    {
      title: 'Congratulations! 🎁',
      body: `You've reached ${visitCount} visits! Claim your reward now.`,
      tag: 'reward-milestone',
      url: '/dashboard/customer/rewards',
      data: { visitCount, type: 'reward-milestone' },
      requireInteraction: true,
    },
    'rewardMilestone'
  );
}

export async function notifyRewardAvailable(phone: string, rewardId: string) {
  return sendNotificationByPhone(
    phone,
    {
      title: 'Reward Ready! 🎉',
      body: 'You have a reward waiting for you. Visit us to claim it!',
      tag: 'reward-available',
      url: '/dashboard/customer/rewards',
      data: { rewardId, type: 'reward-available' },
      requireInteraction: true,
    },
    'rewardAvailable'
  );
}

export async function notifyVisitPeriodReminder(phone: string, daysRemaining: number, visitsCompleted: number) {
  return sendNotificationByPhone(
    phone,
    {
      title: "Don't Miss Out! ⏰",
      body: `You have ${daysRemaining} days left to complete your 5 visits. You've completed ${visitsCompleted} visits. Visit us soon!`,
      tag: 'period-reminder',
      url: '/dashboard/customer',
      data: { daysRemaining, visitsCompleted, type: 'period-reminder' },
      requireInteraction: false,
    },
    'visitPeriodReminder'
  );
}

export async function notifyPeriodReset(phone: string) {
  return sendNotificationByPhone(
    phone,
    {
      title: 'New Period Started',
      body: 'Your visit period has reset. Start earning rewards again!',
      tag: 'period-reset',
      url: '/dashboard/customer',
      data: { type: 'period-reset' },
      requireInteraction: false,
    },
    'periodReset'
  );
}

export async function notifyManualReviewComplete(
  phone: string,
  receiptId: string,
  status: 'approved' | 'rejected'
) {
  return sendNotificationByPhone(
    phone,
    {
      title: 'Receipt Reviewed',
      body: `Your receipt has been reviewed and ${status === 'approved' ? 'accepted' : 'rejected'}.`,
      tag: 'review-complete',
      url: '/dashboard/customer/rewards',
      data: { receiptId, status, type: 'review-complete' },
      requireInteraction: status === 'approved',
    },
    'manualReviewComplete'
  );
}


