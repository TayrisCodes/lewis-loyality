import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Customer from '@/models/Customer';
import Visit from '@/models/Visit';
import Store from '@/models/Store';
import Reward from '@/models/Reward';
import { verifySuperAdminToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const customerId = params.id;

    // Get customer with detailed information
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get visit history with store information
    const visitHistory = await Visit.find({ customerId })
      .populate('storeId', 'name address')
      .sort({ visitDate: -1 })
      .limit(50);

    // Get reward history
    const rewardHistory = await Reward.find({ customerId })
      .populate('storeId', 'name')
      .sort({ earnedAt: -1 })
      .limit(50);

    // Calculate statistics
    const totalVisits = visitHistory.length;
    const totalRewards = rewardHistory.reduce((sum, reward) => sum + reward.amount, 0);
    const totalSpent = visitHistory.reduce((sum, visit) => sum + (visit.amountSpent || 0), 0);
    const averageSpendingPerVisit = totalVisits > 0 ? totalSpent / totalVisits : 0;

    // Calculate visit frequency
    const registeredDate = new Date(customer.registeredAt);
    const now = new Date();
    const daysSinceRegistration = Math.ceil((now.getTime() - registeredDate.getTime()) / (1000 * 60 * 60 * 24));
    const averageVisitFrequency = daysSinceRegistration > 0 ? (totalVisits / daysSinceRegistration) * 7 : 0;

    // Find favorite store (most visited)
    const storeVisitCounts: { [key: string]: number } = {};
    visitHistory.forEach(visit => {
      const storeId = visit.storeId._id.toString();
      storeVisitCounts[storeId] = (storeVisitCounts[storeId] || 0) + 1;
    });

    const favoriteStoreId = Object.keys(storeVisitCounts).reduce((a, b) => 
      storeVisitCounts[a] > storeVisitCounts[b] ? a : b, ''
    );

    const favoriteStore = favoriteStoreId ? 
      await Store.findById(favoriteStoreId).select('name address') : null;

    // Calculate streaks
    const sortedVisits = visitHistory
      .map(v => new Date(v.visitDate))
      .sort((a, b) => b.getTime() - a.getTime());

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    if (sortedVisits.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Calculate current streak
      let checkDate = new Date(today);
      for (const visitDate of sortedVisits) {
        const visitDay = new Date(visitDate);
        visitDay.setHours(0, 0, 0, 0);
        
        if (visitDay.getTime() === checkDate.getTime()) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (visitDay.getTime() < checkDate.getTime()) {
          break;
        }
      }

      // Calculate longest streak
      for (let i = 0; i < sortedVisits.length; i++) {
        if (i === 0) {
          tempStreak = 1;
        } else {
          const prevDate = new Date(sortedVisits[i - 1]);
          const currDate = new Date(sortedVisits[i]);
          const diffDays = Math.ceil((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            tempStreak++;
          } else {
            longestStreak = Math.max(longestStreak, tempStreak);
            tempStreak = 1;
          }
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    // Get monthly visits data
    const monthlyVisits: { [key: string]: number } = {};
    visitHistory.forEach(visit => {
      const month = new Date(visit.visitDate).toISOString().slice(0, 7); // YYYY-MM
      monthlyVisits[month] = (monthlyVisits[month] || 0) + 1;
    });

    const monthlyVisitsArray = Object.entries(monthlyVisits)
      .map(([month, visits]) => ({ month, visits }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months

    // Get top stores
    const topStores = Object.entries(storeVisitCounts)
      .map(([storeId, visits]) => ({ storeId, visits }))
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 10);

    // Get store names for top stores
    const topStoresWithNames = await Promise.all(
      topStores.map(async (store) => {
        const storeData = await Store.findById(store.storeId).select('name');
        return {
          storeId: store.storeId,
          storeName: storeData?.name || 'Unknown Store',
          visits: store.visits
        };
      })
    );

    const customerDetail = {
      _id: customer._id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      totalVisits,
      totalRewards,
      totalSpent,
      averageVisitFrequency,
      lastVisit: visitHistory[0]?.visitDate || null,
      registeredAt: customer.registeredAt,
      isActive: customer.isActive,
      favoriteStore,
      visitHistory: visitHistory.map(visit => ({
        _id: visit._id,
        storeId: {
          _id: visit.storeId._id,
          name: visit.storeId.name,
          address: visit.storeId.address
        },
        visitDate: visit.visitDate,
        rewardsEarned: visit.rewardsEarned,
        amountSpent: visit.amountSpent
      })),
      rewardHistory: rewardHistory.map(reward => ({
        _id: reward._id,
        rewardType: reward.rewardType,
        amount: reward.amount,
        earnedAt: reward.earnedAt,
        storeId: {
          _id: reward.storeId._id,
          name: reward.storeId.name
        }
      })),
      statistics: {
        totalStoresVisited: Object.keys(storeVisitCounts).length,
        averageSpendingPerVisit,
        longestStreak,
        currentStreak,
        monthlyVisits: monthlyVisitsArray,
        topStores: topStoresWithNames
      }
    };

    return NextResponse.json(customerDetail);

  } catch (error) {
    console.error('Error fetching customer detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer detail' },
      { status: 500 }
    );
  }
}

