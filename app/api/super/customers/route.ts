import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Customer from '@/models/Customer';
import Visit from '@/models/Visit';
import Store from '@/models/Store';
import SystemUser from '@/models/SystemUser';
import { verifySuperAdminToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Verify super admin authentication
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifySuperAdminToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const store = searchParams.get('store') || '';
    const admin = searchParams.get('admin') || '';
    const hasRewards = searchParams.get('hasRewards') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const sortBy = searchParams.get('sortBy') || 'lastVisit';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build aggregation pipeline
    const pipeline: any[] = [];

    // Match stage for filtering
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

    // Lookup visits to get visit data
    pipeline.push({
      $lookup: {
        from: 'visits',
        localField: '_id',
        foreignField: 'customerId',
        as: 'visits'
      }
    });

    // Lookup stores for visit data
    pipeline.push({
      $lookup: {
        from: 'stores',
        localField: 'visits.storeId',
        foreignField: '_id',
        as: 'visitStores'
      }
    });

    // Add computed fields
    pipeline.push({
      $addFields: {
        totalVisits: { $size: '$visits' },
        totalRewards: { $sum: '$visits.rewardsEarned' },
        lastVisit: {
          $cond: {
            if: { $gt: [{ $size: '$visits' }, 0] },
            then: { $max: '$visits.visitDate' },
            else: null
          }
        },
        favoriteStore: {
          $cond: {
            if: { $gt: [{ $size: '$visits' }, 0] },
            then: {
              $let: {
                vars: {
                  storeCounts: {
                    $reduce: {
                      input: '$visits',
                      initialValue: {},
                      in: {
                        $mergeObjects: [
                          '$$value',
                          {
                            $arrayToObject: [
                              [{
                                k: { $toString: '$$this.storeId' },
                                v: { $add: [{ $ifNull: [{ $getField: { field: { $toString: '$$this.storeId' }, input: '$$value' } }, 0] }, 1] }
                              }]
                            ]
                          }
                        ]
                      }
                    }
                  }
                },
                in: {
                  $let: {
                    vars: {
                      topStore: {
                        $reduce: {
                          input: { $objectToArray: '$$storeCounts' },
                          initialValue: { k: null, v: 0 },
                          in: {
                            $cond: {
                              if: { $gt: ['$$this.v', '$$value.v'] },
                              then: '$$this',
                              else: '$$value'
                            }
                          }
                        }
                      }
                    },
                    in: {
                      $cond: {
                        if: { $ne: ['$$topStore.k', null] },
                        then: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: '$visitStores',
                                cond: { $eq: [{ $toString: '$$this._id' }, '$$topStore.k'] }
                              }
                            },
                            0
                          ]
                        },
                        else: null
                      }
                    }
                  }
                }
              }
            },
            else: null
          }
        }
      }
    });

    // Store filter
    if (store) {
      pipeline.push({
        $match: {
          'favoriteStore._id': store
        }
      });
    }

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

    // Admin filter (filter by stores managed by specific admin)
    if (admin) {
      pipeline.push({
        $lookup: {
          from: 'systemusers',
          localField: 'favoriteStore._id',
          foreignField: 'storeId',
          as: 'storeAdmin'
        }
      });
      pipeline.push({
        $match: {
          'storeAdmin._id': admin
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

    // Project final fields
    pipeline.push({
      $project: {
        _id: 1,
        name: 1,
        phone: 1,
        email: 1,
        totalVisits: 1,
        totalRewards: 1,
        lastVisit: 1,
        favoriteStore: {
          _id: '$favoriteStore._id',
          name: '$favoriteStore.name'
        },
        registeredAt: 1,
        isActive: 1,
        totalSpent: { $sum: '$visits.amountSpent' },
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
    console.error('Error fetching customers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

