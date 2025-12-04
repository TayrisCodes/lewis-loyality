import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Receipt from '@/models/Receipt';
import { getReceiptPublicUrl } from '@/lib/storage';

/**
 * GET /api/admin/receipts
 * 
 * List receipts for admin review
 * 
 * Auth: Required (admin or superadmin)
 * 
 * Query params:
 * - status: Filter by status (pending, approved, rejected, flagged, flagged_manual_requested)
 * - storeId: Filter by store (optional for superadmin, automatic for admin)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20)
 * - search: Search by customer phone or invoice number
 * 
 * Response:
 * {
 *   receipts: [...],
 *   pagination: {
 *     page: 1,
 *     limit: 20,
 *     total: 150,
 *     pages: 8
 *   },
 *   stats: {
 *     pending: 10,
 *     flagged: 5,
 *     approved: 100,
 *     rejected: 35
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuth();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const storeIdParam = searchParams.get('storeId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const fraudFilter = searchParams.get('fraudFilter'); // all, high, medium, low
    
    // Build query
    const query: any = {};
    
    // Admin can only see their store's receipts
    if (user.role === 'admin') {
      if (!user.storeId) {
        return NextResponse.json(
          { error: 'Admin user has no assigned store' },
          { status: 400 }
        );
      }
      query.storeId = user.storeId;
    } else if (user.role === 'superadmin' && storeIdParam) {
      // Super admin can filter by specific store
      query.storeId = storeIdParam;
    }
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by fraud score
    if (fraudFilter && fraudFilter !== 'all') {
      if (fraudFilter === 'high') {
        query.fraudScore = { $gte: 70 };
      } else if (fraudFilter === 'medium') {
        query.fraudScore = { $gte: 40, $lt: 70 };
      } else if (fraudFilter === 'low') {
        query.$or = [
          { fraudScore: { $lt: 40 } },
          { fraudScore: { $exists: false } },
        ];
      }
    }
    
    // Search by phone or invoice
    if (search) {
      if (query.$or) {
        // Merge with existing $or from fraud filter
        query.$and = [
          { $or: query.$or },
          {
            $or: [
              { customerPhone: { $regex: search, $options: 'i' } },
              { invoiceNo: { $regex: search, $options: 'i' } },
            ],
          },
        ];
        delete query.$or;
      } else {
        query.$or = [
          { customerPhone: { $regex: search, $options: 'i' } },
          { invoiceNo: { $regex: search, $options: 'i' } },
        ];
      }
    }
    
    // Get total count for pagination
    const total = await Receipt.countDocuments(query);
    
    // Get receipts with pagination
    const receipts = await Receipt.find(query)
      .populate('storeId', 'name address')
      .populate('customerId', 'name phone')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    
    // Add image URLs
    const receiptsWithUrls = receipts.map((receipt) => ({
      ...receipt,
      imageUrl: getReceiptPublicUrl(receipt.imageUrl),
    }));
    
    // Get statistics
    const statsQuery = user.role === 'admin' && user.storeId 
      ? { storeId: user.storeId } 
      : {};
    
    const stats = await Receipt.aggregate([
      { $match: statsQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);
    
    const statsObj: any = {
      pending: 0,
      approved: 0,
      rejected: 0,
      flagged: 0,
      flagged_manual_requested: 0,
    };
    
    stats.forEach((stat) => {
      statsObj[stat._id] = stat.count;
    });
    
    return NextResponse.json({
      receipts: receiptsWithUrls,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: statsObj,
    });
    
  } catch (error) {
    console.error('Admin receipts list error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

