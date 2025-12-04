import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Reward from '@/models/Reward';
import Customer from '@/models/Customer';
import Receipt from '@/models/Receipt';

/**
 * GET /api/customer/rewards/status
 * 
 * Get customer reward status including:
 * - Pending rewards (can claim)
 * - Reward progress (visits within 45 days)
 * - Claimed/redeemed/used rewards
 * 
 * Query params:
 * - phone: Customer phone number (required)
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get('phone');
    
    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }
    
    const customer = await Customer.findOne({ phone });
    if (!customer) {
      return NextResponse.json({
        success: true,
        hasCustomer: false,
        visitsInPeriod: 0,
        visitsNeeded: 5,
        pendingRewards: [],
        rewards: [],
      });
    }
    
    // Find the first approved receipt (start of current 45-day period)
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
      periodEndDate.setDate(periodEndDate.getDate() + 45);
      
      daysRemaining = Math.max(0, Math.ceil((periodEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Check if period has expired (45 days passed since first visit)
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
          periodEndDate.setDate(periodEndDate.getDate() + 45);
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
        // Period still active - count visits within current 45-day period
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
      periodEndDate.setDate(periodEndDate.getDate() + 45);
      daysRemaining = 45;
      recentVisits = 0;
    }
    
    // Get all rewards for this customer
    const allRewards = await Reward.find({
      customerId: customer._id,
    })
      .populate('storeId', 'name')
      .sort({ issuedAt: -1 });
    
    const pendingRewards = allRewards.filter(r => r.status === 'pending');
    const claimedRewards = allRewards.filter(r => r.status === 'claimed');
    const redeemedRewards = allRewards.filter(r => r.status === 'redeemed');
    const usedRewards = allRewards.filter(r => r.status === 'used');
    
    return NextResponse.json({
      success: true,
      hasCustomer: true,
      visitsInPeriod: recentVisits,
      visitsNeeded: 5,
      periodStartDate: periodStartDate?.toISOString() || null,
      periodEndDate: periodEndDate?.toISOString() || null,
      daysRemaining: daysRemaining,
      periodExpired: periodExpired,
      canClaim: pendingRewards.length > 0,
      pendingRewards: pendingRewards.map(r => ({
        id: r._id,
        code: r.code,
        issuedAt: r.issuedAt,
        expiresAt: r.expiresAt,
      })),
      rewards: {
        pending: pendingRewards.length,
        claimed: claimedRewards.length,
        redeemed: redeemedRewards.length,
        used: usedRewards.length,
      },
      recentRewards: allRewards.slice(0, 20).map(r => ({
        id: r._id,
        code: r.code,
        status: r.status,
        rewardType: r.rewardType,
        dateIssued: r.issuedAt, // Add dateIssued for compatibility
        issuedAt: r.issuedAt,
        expiresAt: r.expiresAt,
        discountCode: r.discountCode,
        discountPercent: r.discountPercent,
        qrCode: r.qrCode,
      })),
    });
    
  } catch (error: any) {
    console.error('Error fetching reward status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch reward status' },
      { status: 500 }
    );
  }
}

