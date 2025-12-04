import dbConnect from './db';
import Customer from '@/models/Customer';
import Receipt from '@/models/Receipt';
import Reward from '@/models/Reward';
import { getRewardPeriodDays, getRequiredVisits } from './systemSettings';

/**
 * Get reward status for a customer by phone number
 * Used by scheduled notifications and other services
 */
export async function getRewardStatus(phone: string) {
  try {
    await dbConnect();
    
    const customer = await Customer.findOne({ phone });
    if (!customer) {
      return null;
    }
    
    // Get reward period days from system settings
    const rewardPeriodDays = await getRewardPeriodDays();
    const requiredVisits = await getRequiredVisits();
    
    // Find the first approved receipt (start of current reward period)
    const firstApprovedReceipt = await Receipt.findOne({
      customerPhone: phone,
      status: 'approved',
    })
      .sort({ processedAt: 1 }); // Get the earliest receipt
    
    const now = new Date();
    let periodStartDate: Date;
    let periodEndDate: Date;
    let recentVisits = 0;
    let periodExpired = false;
    let daysRemaining = 0;
    
    if (firstApprovedReceipt && firstApprovedReceipt.processedAt) {
      // Calculate period start date (first visit date)
      periodStartDate = new Date(firstApprovedReceipt.processedAt);
      periodEndDate = new Date(periodStartDate);
      periodEndDate.setDate(periodEndDate.getDate() + rewardPeriodDays);
      
      daysRemaining = Math.max(0, Math.ceil((periodEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Check if period has expired
      periodExpired = now > periodEndDate;
      
      if (periodExpired) {
        // Period expired - find the most recent receipt to start new period
        const mostRecentReceipt = await Receipt.findOne({
          customerPhone: phone,
          status: 'approved',
        })
          .sort({ processedAt: -1 });
        
        if (mostRecentReceipt && mostRecentReceipt.processedAt) {
          // Start new period from most recent receipt
          periodStartDate = new Date(mostRecentReceipt.processedAt);
          periodEndDate = new Date(periodStartDate);
          periodEndDate.setDate(periodEndDate.getDate() + rewardPeriodDays);
          daysRemaining = Math.max(0, Math.ceil((periodEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          
          // Count visits from new period start
          recentVisits = await Receipt.countDocuments({
            customerPhone: phone,
            status: 'approved',
            processedAt: {
              $gte: periodStartDate,
            },
          });
        }
      } else {
        // Period still active - count visits within current period
        recentVisits = await Receipt.countDocuments({
          customerPhone: phone,
          status: 'approved',
          processedAt: {
            $gte: periodStartDate,
            $lte: periodEndDate,
          },
        });
      }
    } else {
      // No receipts yet
      periodStartDate = now;
      periodEndDate = new Date(periodStartDate);
      periodEndDate.setDate(periodEndDate.getDate() + rewardPeriodDays);
      daysRemaining = rewardPeriodDays;
      recentVisits = 0;
    }
    
    return {
      visitsInPeriod: recentVisits,
      visitsNeeded: requiredVisits,
      periodStartDate: periodStartDate?.toISOString() || null,
      periodEndDate: periodEndDate?.toISOString() || null,
      daysRemaining: daysRemaining,
      periodExpired: periodExpired,
    };
  } catch (error) {
    console.error('Error getting reward status:', error);
    return null;
  }
}




