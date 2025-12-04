import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Customer from '@/models/Customer';
import Visit from '@/models/Visit';
import Store from '@/models/Store';
import SystemUser from '@/models/SystemUser';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || (decoded.role !== 'admin' && decoded.role !== 'superadmin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Get admin's store ID
    const admin = await SystemUser.findById(decoded.userId).populate('storeId');
    if (!admin || !admin.storeId) {
      return NextResponse.json({ error: 'Admin not assigned to any store' }, { status: 400 });
    }

    const storeId = admin.storeId._id;

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const hasRewards = searchParams.get('hasRewards') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const sortBy = searchParams.get('sortBy') || 'lastVisit';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build aggregation pipeline
    const pipeline: any[] = [];

    // Match stage for filtering - only customers who have visited this store
    const matchStage: any = {};

    // Search filter
    if (search) {
      matchStage.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Date range filter
    if (dateFrom || dateTo) {
      matchStage.registeredAt = {};
      if (dateFrom) {
        matchStage.registeredAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        matchStage.registeredAt.$lte = new Date(dateTo);
      }
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // Lookup visits to this specific store only (include receipt info)
    pipeline.push({
      $lookup: {
        from: 'visits',
        let: { customerId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$customerId', '$$customerId'] },
                  { $eq: ['$storeId', storeId] }
                ]
              }
            }
          },
          {
            $lookup: {
              from: 'receipts',
              localField: 'receiptId',
              foreignField: '_id',
              as: 'receiptData'
            }
          },
          {
            $addFields: {
              receiptInfo: { $arrayElemAt: ['$receiptData', 0] }
            }
          }
        ],
        as: 'storeVisits'
      }
    });

    // Add computed fields (including receipt-specific metrics)
    pipeline.push({
      $addFields: {
        totalVisits: { $size: '$storeVisits' },
        totalRewards: { $sum: '$storeVisits.rewardsEarned' },
        qrVisits: {
          $size: {
            $filter: {
              input: '$storeVisits',
              as: 'visit',
              cond: { $eq: ['$$visit.visitMethod', 'qr'] }
            }
          }
        },
        receiptVisits: {
          $size: {
            $filter: {
              input: '$storeVisits',
              as: 'visit',
              cond: { $eq: ['$$visit.visitMethod', 'receipt'] }
            }
          }
        },
        lastVisit: {
          $cond: {
            if: { $gt: [{ $size: '$storeVisits' }, 0] },
            then: { $max: '$storeVisits.timestamp' },
            else: null
          }
        },
        totalSpent: { $sum: '$storeVisits.amountSpent' }
      }
    });

    // Only include customers who have visited this store
    pipeline.push({
      $match: {
        totalVisits: { $gt: 0 }
      }
    });

    // Rewards filter
    if (hasRewards === 'true') {
      pipeline.push({
        $match: {
          totalRewards: { $gt: 0 }
        }
      });
    } else if (hasRewards === 'false') {
      pipeline.push({
        $match: {
          totalRewards: 0
        }
      });
    }

    // Sort stage
    const sortStage: any = {};
    sortStage[sortBy] = sortOrder === 'desc' ? -1 : 1;
    pipeline.push({ $sort: sortStage });

    // Count total documents
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Customer.aggregate(countPipeline);
    const totalCustomers = countResult[0]?.total || 0;

    // Pagination
    const skip = (page - 1) * limit;
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limit });

    // Project final fields (including receipt metrics)
    pipeline.push({
      $project: {
        _id: 1,
        name: 1,
        phone: 1,
        email: 1,
        totalVisits: 1,
        qrVisits: 1,
        receiptVisits: 1,
        totalRewards: 1,
        lastVisit: 1,
        registeredAt: 1,
        isActive: 1,
        totalSpent: 1,
        averageVisitFrequency: {
          $cond: {
            if: { $gt: ['$totalVisits', 0] },
            then: {
              $divide: [
                '$totalVisits',
                {
                  $divide: [
                    { $subtract: [new Date(), '$registeredAt'] },
                    7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
                  ]
                }
              ]
            },
            else: 0
          }
        }
      }
    });

    const customers = await Customer.aggregate(pipeline);
    const totalPages = Math.ceil(totalCustomers / limit);

    return NextResponse.json({
      customers,
      totalPages,
      totalCustomers,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    });

  } catch (error) {
    console.error('Error fetching admin customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}