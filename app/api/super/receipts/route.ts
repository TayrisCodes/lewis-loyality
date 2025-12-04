import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Receipt from '@/models/Receipt';
import Store from '@/models/Store';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/super/receipts
 * Get all receipts from all stores (super admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify super admin authentication
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized - Super admin only' }, { status: 401 });
    }

    await dbConnect();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const storeId = searchParams.get('storeId') || '';
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build query
    const query: any = {};

    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }

    // Filter by store
    if (storeId) {
      query.storeId = storeId;
    }

    // Search by phone or invoice number
    if (search) {
      query.$or = [
        { customerPhone: { $regex: search, $options: 'i' } },
        { invoiceNo: { $regex: search, $options: 'i' } }
      ];
    }

    // Get total count for pagination
    const totalReceipts = await Receipt.countDocuments(query);

    // Get receipts with pagination
    const receipts = await Receipt.find(query)
      .populate('storeId', 'name address')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Get statistics across all stores
    const stats = await Receipt.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Format statistics
    const statistics = {
      total: totalReceipts,
      pending: stats.find(s => s._id === 'pending')?.count || 0,
      approved: stats.find(s => s._id === 'approved')?.count || 0,
      rejected: stats.find(s => s._id === 'rejected')?.count || 0,
      flagged: stats.find(s => s._id === 'flagged')?.count || 0,
      flaggedManual: stats.find(s => s._id === 'flagged_manual_requested')?.count || 0,
      needsStoreSelection: stats.find(s => s._id === 'needs_store_selection')?.count || 0,
    };

    // Get receipts by store (top 10 stores by receipt count)
    const receiptsByStore = await Receipt.aggregate([
      {
        $group: {
          _id: '$storeId',
          count: { $sum: 1 },
          flagged: {
            $sum: {
              $cond: [
                { $in: ['$status', ['flagged', 'flagged_manual_requested']] },
                1,
                0
              ]
            }
          },
          approved: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Populate store names
    const storeIds = receiptsByStore.map(r => r._id);
    const stores = await Store.find({ _id: { $in: storeIds } }).select('_id name');
    const storeMap = stores.reduce((acc: any, store) => {
      acc[String(store._id)] = store.name;
      return acc;
    }, {});

    const storeStats = receiptsByStore.map(r => ({
      storeId: r._id,
      storeName: storeMap[r._id.toString()] || 'Unknown',
      total: r.count,
      flagged: r.flagged,
      approved: r.approved,
      rejected: r.rejected
    }));

    const totalPages = Math.ceil(totalReceipts / limit);

    return NextResponse.json({
      receipts,
      statistics,
      storeStats,
      pagination: {
        currentPage: page,
        totalPages,
        totalReceipts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error: any) {
    console.error('Error fetching receipts:', error);
    console.error('Error stack:', error?.stack);
    return NextResponse.json(
      { 
        error: 'Failed to fetch receipts',
        message: error?.message || 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}


