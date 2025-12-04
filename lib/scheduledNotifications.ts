import dbConnect from './db';
import Customer from '@/models/Customer';
import PushSubscription from '@/models/PushSubscription';
import NotificationPreferences from '@/models/NotificationPreferences';
import {
  notifyVisitPeriodReminder,
  sendNotificationByPhone,
} from './pushNotifications';
import { getRewardStatus } from './rewardStatusHelper';

/**
 * Send motivation notification to customers (every 3 days)
 * Encourages them to visit and get their discount
 */
export async function sendMotivationNotifications(): Promise<number> {
  try {
    await dbConnect();
    
    console.log('[Scheduled] Sending motivation notifications...');
    
    // Get all customers with active push subscriptions
    const subscriptions = await PushSubscription.find({ isActive: true })
      .populate('customerId');
    
    let sentCount = 0;
    const now = new Date();
    
    for (const subscription of subscriptions) {
      try {
        const customer = await Customer.findById(subscription.customerId);
        if (!customer) continue;
        
        // Check preferences
        const preferences = await NotificationPreferences.findOne({
          customerId: customer._id,
        });
        
        if (preferences && !preferences.visitPeriodReminder) {
          continue; // Skip if disabled
        }
        
        // Calculate days since last visit
        const daysSinceLastVisit = Math.floor(
          (now.getTime() - new Date(customer.lastVisit).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        // Only send if last visit was more than 3 days ago
        if (daysSinceLastVisit >= 3) {
          await sendNotificationByPhone(
            customer.phone,
            {
              title: 'Visit Us Today! 🛒',
              body: `It's been ${daysSinceLastVisit} days since your last visit. Come shop with us and earn rewards!`,
              tag: 'motivation',
              url: '/dashboard/customer',
              data: {
                type: 'motivation',
                daysSinceLastVisit,
              },
              requireInteraction: false,
              actions: [
                {
                  action: 'visit',
                  title: 'View Rewards',
                },
              ],
            },
            'visitPeriodReminder'
          );
          
          sentCount++;
          console.log(`[Scheduled] Sent motivation to ${customer.phone}`);
        }
      } catch (error) {
        console.error(`[Scheduled] Error sending to ${subscription.customerPhone}:`, error);
      }
    }
    
    console.log(`[Scheduled] Motivation notifications sent: ${sentCount}`);
    return sentCount;
  } catch (error) {
    console.error('[Scheduled] Error sending motivation notifications:', error);
    return 0;
  }
}

/**
 * Send expiry reminder notifications (every 15 days)
 * Reminds customers about their visit period and reward mission
 */
export async function sendExpiryReminderNotifications(): Promise<number> {
  try {
    await dbConnect();
    
    console.log('[Scheduled] Sending expiry reminder notifications...');
    
    // Get all customers with active subscriptions
    const subscriptions = await PushSubscription.find({ isActive: true });
    
    let sentCount = 0;
    
    for (const subscription of subscriptions) {
      try {
        const customer = await Customer.findById(subscription.customerId);
        if (!customer) continue;
        
        // Check preferences
        const preferences = await NotificationPreferences.findOne({
          customerId: customer._id,
        });
        
        if (preferences && !preferences.visitPeriodReminder) {
          continue;
        }
        
        // Calculate reward period status
        const rewardStatus = await getRewardStatus(customer.phone);
        
        if (!rewardStatus) continue;
        
        // Only send if customer has an active period
        if (rewardStatus.periodEndDate && !rewardStatus.periodExpired) {
          const endDate = new Date(rewardStatus.periodEndDate);
          const now = new Date();
          const daysRemaining = Math.floor(
            (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          // Send reminder if 15 days or less remaining
          if (daysRemaining <= 15 && daysRemaining > 0) {
            const visitsCompleted = rewardStatus.visitsInPeriod || 0;
            const visitsNeeded = rewardStatus.visitsNeeded || 5;
            const remainingVisits = visitsNeeded - visitsCompleted;
            
            await sendNotificationByPhone(
              customer.phone,
              {
                title: '⏰ Complete Your Mission!',
                body: `You have ${daysRemaining} day${daysRemaining > 1 ? 's' : ''} left! Complete ${remainingVisits} more visit${remainingVisits > 1 ? 's' : ''} to earn your reward.`,
                tag: 'expiry-reminder',
                url: '/dashboard/customer',
                data: {
                  type: 'expiry-reminder',
                  daysRemaining,
                  visitsCompleted,
                  visitsNeeded,
                  remainingVisits,
                },
                requireInteraction: true,
                actions: [
                  {
                    action: 'view-rewards',
                    title: 'View Progress',
                  },
                ],
              },
              'visitPeriodReminder'
            );
            
            sentCount++;
            console.log(`[Scheduled] Sent expiry reminder to ${customer.phone} (${daysRemaining} days left)`);
          }
        }
      } catch (error) {
        console.error(`[Scheduled] Error sending reminder to ${subscription.customerPhone}:`, error);
      }
    }
    
    console.log(`[Scheduled] Expiry reminder notifications sent: ${sentCount}`);
    return sentCount;
  } catch (error) {
    console.error('[Scheduled] Error sending expiry reminder notifications:', error);
    return 0;
  }
}

/**
 * Send both scheduled notifications
 * Call this from a cron job or scheduled task
 */
export async function sendAllScheduledNotifications(): Promise<{
  motivation: number;
  expiryReminder: number;
}> {
  const motivationCount = await sendMotivationNotifications();
  const expiryReminderCount = await sendExpiryReminderNotifications();
  
  return {
    motivation: motivationCount,
    expiryReminder: expiryReminderCount,
  };
}

