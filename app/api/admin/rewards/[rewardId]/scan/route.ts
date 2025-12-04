import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Reward from '@/models/Reward';
import SystemUser from '@/models/SystemUser';
import { requireAuth } from '@/lib/auth';

/**
 * POST /api/admin/rewards/[rewardId]/scan
 * 
 * Admin scans QR code to mark reward as used
 * Changes reward status from "redeemed" to "used"
 * 
 * Request body: (none required)
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
    
    // Get admin info with store ID (for tracking which store/admin used the reward)
    const admin = await SystemUser.findById(user.userId).populate('storeId');
    const adminStoreId = (admin?.storeId && typeof admin.storeId === 'object' && '_id' in admin.storeId)
      ? (admin.storeId as any)._id
      : admin?.storeId || user.storeId;
    
    const { rewardId } = await params;
    
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
    
    // Check if reward is already used
    if (reward.status === 'used') {
      return NextResponse.json(
        { success: false, error: 'DiscountCard is used' },
        { status: 400 }
      );
    }
    
    if (reward.status !== 'redeemed') {
      return NextResponse.json(
        { success: false, error: `Reward is in "${reward.status}" status. Only "redeemed" rewards can be marked as used.` },
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
    
    // Get customer info (customerId is populated)
    const customerName = typeof reward.customerId === 'object' && reward.customerId !== null && 'name' in reward.customerId
      ? (reward.customerId as any).name
      : '';
    const customerPhone = typeof reward.customerId === 'object' && reward.customerId !== null && 'phone' in reward.customerId
      ? (reward.customerId as any).phone
      : '';
    
    // Get store name (storeId is populated)
    const storeName = typeof reward.storeId === 'object' && reward.storeId !== null && 'name' in reward.storeId
      ? (reward.storeId as any).name
      : '';
    
    // Update reward to "used" status with tracking info
    reward.status = 'used';
    reward.usedAt = new Date();
    reward.usedByAdminId = user.userId as any; // Track which admin scanned the reward
    if (adminStoreId) {
      reward.usedAtStoreId = adminStoreId as any; // Track which store the reward was used at (may differ from storeId where reward was created)
    }
    await reward.save();
    
    console.log(`✅ Reward ${reward.code} marked as used by admin ${user.userId} at store ${adminStoreId}`);
    
    return NextResponse.json({
      success: true,
      message: 'Reward marked as used. Customer can now claim a new reward after 5 more visits.',
      data: {
        rewardId: reward._id,
        code: reward.code,
        status: reward.status,
        usedAt: reward.usedAt,
        customer: {
          name: customerName,
          phone: customerPhone,
        },
        store: {
          name: storeName,
        },
        usedBy: {
          adminId: String(user.userId),
          storeId: String(adminStoreId),
        },
      },
    });
    
  } catch (error: any) {
    console.error('Error scanning reward:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to mark reward as used' },
      { status: 500 }
    );
  }
}

