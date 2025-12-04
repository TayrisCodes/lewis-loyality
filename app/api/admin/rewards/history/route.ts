import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Reward from '@/models/Reward';
import SystemUser from '@/models/SystemUser';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/admin/rewards/history
 * 
 * Get reward history for admin - shows all rewards this admin has scanned/redeemed
 * Shows which customers received discounts and when
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

    // Get admin info
    const admin = await SystemUser.findById(user.userId);
    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query - rewards scanned/redeemed by this admin
    const query: any = {
      usedByAdminId: admin._id, // Only rewards this admin scanned
    };

    // Date range filter
    if (startDate || endDate) {
      query.usedAt = {};
      if (startDate) {
        query.usedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.usedAt.$lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Fetch rewards with customer and store info
    const rewards = await Reward.find(query)
      .populate('customerId', 'name phone')
      .populate('storeId', 'name')
      .populate('usedAtStoreId', 'name address')
      .sort({ usedAt: -1 }) // Most recent first
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalCount = await Reward.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    // Format rewards for response
    const formattedRewards = rewards.map((r: any) => {
      const customerId = typeof r.customerId === 'object' && r.customerId !== null && '_id' in r.customerId
        ? String((r.customerId as any)._id)
        : '';
      const customerName = typeof r.customerId === 'object' && r.customerId !== null && 'name' in r.customerId
        ? (r.customerId as any).name
        : 'Unknown';
      const customerPhone = typeof r.customerId === 'object' && r.customerId !== null && 'phone' in r.customerId
        ? (r.customerId as any).phone
        : '';
      
      const storeName = typeof r.storeId === 'object' && r.storeId !== null && 'name' in r.storeId
        ? (r.storeId as any).name
        : 'Unknown';
      
      const usedAtStoreName = typeof r.usedAtStoreId === 'object' && r.usedAtStoreId !== null && 'name' in r.usedAtStoreId
        ? (r.usedAtStoreId as any).name
        : storeName; // Fallback to original store if not set

      return {
        id: r._id,
        code: r.code,
        status: r.status,
        rewardType: r.rewardType,
        discountPercent: r.discountPercent,
        discountCode: r.discountCode,
        issuedAt: r.issuedAt,
        usedAt: r.usedAt,
        expiresAt: r.expiresAt,
        customer: {
          id: customerId,
          name: customerName,
          phone: customerPhone,
        },
        store: {
          name: storeName, // Where reward was created
        },
        usedAtStore: {
          name: usedAtStoreName, // Where reward was actually used
        },
      };
    });

    // Calculate statistics
    const stats = {
      totalScanned: totalCount,
      totalScannedThisMonth: await Reward.countDocuments({
        ...query,
        usedAt: {
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      }),
      totalScannedToday: await Reward.countDocuments({
        ...query,
        usedAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      }),
    };

    return NextResponse.json({
      success: true,
      rewards: formattedRewards,
      stats,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });

  } catch (error: any) {
    console.error('Error fetching reward history:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch reward history' },
      { status: 500 }
    );
  }
}

