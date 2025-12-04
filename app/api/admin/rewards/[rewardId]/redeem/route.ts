import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Reward from '@/models/Reward';
import { requireAuth } from '@/lib/auth';
import { getDiscountPercent, getRedemptionExpirationDays } from '@/lib/systemSettings';

/**
 * POST /api/admin/rewards/[rewardId]/redeem
 * 
 * Admin redeems a claimed reward
 * Changes reward status from "claimed" to "redeemed"
 * Generates QR code and discount code for customer
 * 
 * Request body:
 * {
 *   discountPercent?: number (default: 10)
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ rewardId: string }> }
) {
  try {
    // Verify admin authentication
    const user = await requireAuth();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    
    const { rewardId } = await params;
    
    const body = await request.json();
    // Get discount percent from system settings (can be overridden by request body)
    const systemDiscountPercent = await getDiscountPercent();
    const { discountPercent = systemDiscountPercent } = body;
    
    // Find reward
    const reward = await Reward.findById(rewardId)
      .populate('customerId', 'name phone')
      .populate('storeId', 'name');
    
    if (!reward) {
      return NextResponse.json(
        { success: false, error: 'Reward not found' },
        { status: 404 }
      );
    }
    
    if (reward.status !== 'claimed') {
      return NextResponse.json(
        { success: false, error: `Reward is in "${reward.status}" status. Only "claimed" rewards can be redeemed.` },
        { status: 400 }
      );
    }
    
    // Check if reward has expired
    if (reward.expiresAt && new Date() > reward.expiresAt) {
      reward.status = 'expired';
      await reward.save();
      
      return NextResponse.json(
        { success: false, error: 'This reward has expired' },
        { status: 400 }
      );
    }
    
    // Get redemption expiration days from system settings
    const redemptionExpirationDays = await getRedemptionExpirationDays();
    
    // Generate discount code
    const discountCode = `DISC${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    // Get customer phone (customerId is populated)
    const customerPhone = typeof reward.customerId === 'object' && reward.customerId !== null && 'phone' in reward.customerId
      ? (reward.customerId as any).phone
      : '';
    
    // Get store name (storeId is populated)
    const storeName = typeof reward.storeId === 'object' && reward.storeId !== null && 'name' in reward.storeId
      ? (reward.storeId as any).name
      : '';
    
    // Calculate expiration date from system settings
    const expirationDate = new Date(Date.now() + redemptionExpirationDays * 24 * 60 * 60 * 1000);
    
    // Generate QR code data (simple format: REWARD_CODE|DISCOUNT_CODE)
    const qrCodeData = JSON.stringify({
      type: 'reward_discount',
      rewardId: String(reward._id),
      discountCode: discountCode,
      discountPercent: discountPercent,
      customerPhone: customerPhone,
      expiresAt: expirationDate.toISOString(),
    });
    
    // Update reward to "redeemed" status
    reward.status = 'redeemed';
    reward.redeemedAt = new Date();
    reward.discountPercent = discountPercent;
    reward.discountCode = discountCode;
    reward.qrCode = qrCodeData;
    reward.expiresAt = expirationDate; // Use system setting for expiration
    await reward.save();
    
    console.log(`✅ Reward ${reward.code} redeemed by admin ${user.userId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Reward redeemed successfully. QR code generated.',
      data: {
        rewardId: reward._id,
        code: reward.code,
        discountCode: discountCode,
        discountPercent: discountPercent,
        qrCode: qrCodeData,
        status: reward.status,
        redeemedAt: reward.redeemedAt,
        expiresAt: reward.expiresAt,
        customer: {
          name: typeof reward.customerId === 'object' && reward.customerId !== null && 'name' in reward.customerId
            ? (reward.customerId as any).name
            : '',
          phone: customerPhone,
        },
        store: {
          name: storeName,
        },
      },
    });
    
  } catch (error: any) {
    console.error('Error redeeming reward:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to redeem reward' },
      { status: 500 }
    );
  }
}

