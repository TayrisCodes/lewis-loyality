import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Reward from '@/models/Reward';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/admin/rewards
 * 
 * Get all rewards for admin's store
 * Filters by status if provided
 * 
 * Query params:
 * - status: Filter by status (pending, claimed, redeemed, used, expired)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await dbConnect();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    // Build query
    const query: any = {};
    
    // If admin has a storeId, filter by store
    if (user.storeId) {
      query.storeId = user.storeId;
    }
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Fetch rewards with customer and store info
    const rewards = await Reward.find(query)
      .populate('customerId', 'name phone')
      .populate('storeId', 'name')
      .sort({ issuedAt: -1 })
      .limit(100); // Limit to recent 100 rewards

    // Group by status for stats
    const stats = {
      pending: rewards.filter(r => r.status === 'pending').length,
      claimed: rewards.filter(r => r.status === 'claimed').length,
      redeemed: rewards.filter(r => r.status === 'redeemed').length,
      used: rewards.filter(r => r.status === 'used').length,
      expired: rewards.filter(r => r.status === 'expired').length,
    };

    return NextResponse.json({
      success: true,
      rewards: rewards.map(r => {
        // Safely extract customer info (customerId is populated)
        const customerId = typeof r.customerId === 'object' && r.customerId !== null && '_id' in r.customerId
          ? String((r.customerId as any)._id)
          : '';
        const customerName = typeof r.customerId === 'object' && r.customerId !== null && 'name' in r.customerId
          ? (r.customerId as any).name
          : 'Unknown';
        const customerPhone = typeof r.customerId === 'object' && r.customerId !== null && 'phone' in r.customerId
          ? (r.customerId as any).phone
          : '';
        
        // Safely extract store info (storeId is populated)
        const storeId = typeof r.storeId === 'object' && r.storeId !== null && '_id' in r.storeId
          ? String((r.storeId as any)._id)
          : '';
        const storeName = typeof r.storeId === 'object' && r.storeId !== null && 'name' in r.storeId
          ? (r.storeId as any).name
          : 'Unknown';
        
        return {
          id: r._id,
          code: r.code,
          status: r.status,
          rewardType: r.rewardType,
          discountPercent: r.discountPercent,
          discountCode: r.discountCode,
          qrCode: r.qrCode,
          issuedAt: r.issuedAt,
          claimedAt: r.claimedAt,
          redeemedAt: r.redeemedAt,
          usedAt: r.usedAt,
          expiresAt: r.expiresAt,
          customer: {
            id: customerId,
            name: customerName,
            phone: customerPhone,
          },
          store: {
            id: storeId,
            name: storeName,
          },
        };
      }),
      stats,
    });

  } catch (error: any) {
    console.error('Error fetching rewards:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch rewards' },
      { status: 500 }
    );
  }
}

