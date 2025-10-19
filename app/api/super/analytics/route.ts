import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Store from '@/models/Store';
import User from '@/models/SystemUser';
import Customer from '@/models/Customer';
import Visit from '@/models/Visit';
import { requireSuperAdmin, PERMISSIONS } from '@/lib/auth';

export async function GET() {
  try {
    await dbConnect();
    await requireSuperAdmin([PERMISSIONS.VIEW_ANALYTICS]);

    // Get date ranges
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Aggregate metrics
    const [
      totalStores,
      totalAdmins,
      totalCustomers,
      totalVisits,
      visitsLast7Days,
      visitsLast30Days,
      rewardsGiven,
    ] = await Promise.all([
      Store.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'admin', isActive: true }),
      Customer.countDocuments(),
      Visit.countDocuments(),
      Visit.countDocuments({ timestamp: { $gte: sevenDaysAgo } }),
      Visit.countDocuments({ timestamp: { $gte: thirtyDaysAgo } }),
      Visit.countDocuments({ rewardEarned: true }),
    ]);

    // Daily visits for chart (last 7 days)
    const dailyVisits = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const count = await Visit.countDocuments({
        timestamp: { $gte: startOfDay, $lte: endOfDay }
      });

      dailyVisits.push({
        date: date.toISOString().split('T')[0],
        visits: count,
      });
    }

    // Top stores by visits
    const topStores = await Visit.aggregate([
      {
        $group: {
          _id: '$storeId',
          visitCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'stores',
          localField: '_id',
          foreignField: '_id',
          as: 'store',
        },
      },
      {
        $unwind: '$store',
      },
      {
        $project: {
          name: '$store.name',
          visitCount: 1,
        },
      },
      {
        $sort: { visitCount: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    // Top customers by visits
    const topCustomers = await Visit.aggregate([
      {
        $group: {
          _id: '$customerId',
          totalVisits: { $sum: 1 },
          totalRewards: { $sum: '$rewardsEarned' },
          lastVisit: { $max: '$visitDate' },
        },
      },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customer',
        },
      },
      {
        $unwind: '$customer',
      },
      {
        $project: {
          _id: '$customer._id',
          name: '$customer.name',
          totalVisits: 1,
          totalRewards: 1,
          lastVisit: 1,
        },
      },
      {
        $sort: { totalVisits: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    return NextResponse.json({
      totalStores,
      totalAdmins,
      totalCustomers,
      totalVisits,
      visitsLast7Days,
      visitsLast30Days,
      rewardsGiven,
      dailyVisits,
      topStores,
      topCustomers,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}