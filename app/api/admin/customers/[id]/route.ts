import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Customer from '@/models/Customer';
import Visit from '@/models/Visit';
import Store from '@/models/Store';
import Reward from '@/models/Reward';
import Receipt from '@/models/Receipt';
import SystemUser from '@/models/SystemUser';
import { verifyAdminToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    // Verify admin authentication
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAdminToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const customerId = params.id;

    // Get admin's store ID
    const admin = await SystemUser.findById(decoded.userId).populate('storeId');
    if (!admin || !admin.storeId) {
      return NextResponse.json({ error: 'Admin not assigned to any store' }, { status: 400 });
    }

    const storeId = admin.storeId._id;

    // Get customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Get visit history for this store only
    const visitHistory = await Visit.find({ 
      customerId, 
      storeId 
    }).sort({ visitDate: -1 }).limit(50);

    // Get reward history for this store only
    const rewardHistory = await Reward.find({ 
      customerId, 
      storeId 
    }).sort({ issuedAt: -1 }).limit(50);

    // Get receipts for this customer at this store only
    const receipts = await Receipt.find({
      customerId,
      storeId
    })
      .populate('storeId', 'name address')
      .sort({ createdAt: -1 })
      .limit(50);

    // Calculate statistics
    const totalVisits = visitHistory.length;
    const totalRewards = rewardHistory.length; // Count of rewards, not monetary amount
    const totalSpent = 0; // Amount spent not tracked in current Visit model
    const averageSpendingPerVisit = 0; // Not available without amountSpent

    // Calculate visit frequency
    const registeredDate = new Date(customer.createdAt);
    const now = new Date();
    const daysSinceRegistration = Math.ceil((now.getTime() - registeredDate.getTime()) / (1000 * 60 * 60 * 24));
    const averageVisitFrequency = daysSinceRegistration > 0 ? (totalVisits / daysSinceRegistration) * 7 : 0;

    // Calculate streaks for this store only
    const sortedVisits = visitHistory
      .map(v => new Date(v.timestamp))
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

    // Get monthly visits data for this store
    const monthlyVisits: { [key: string]: number } = {};
    visitHistory.forEach(visit => {
      const month = new Date(visit.timestamp).toISOString().slice(0, 7); // YYYY-MM
      monthlyVisits[month] = (monthlyVisits[month] || 0) + 1;
    });

    const monthlyVisitsArray = Object.entries(monthlyVisits)
      .map(([month, visits]) => ({ month, visits }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months

    const customerDetail = {
      _id: customer._id,
      name: customer.name,
      phone: customer.phone,
      totalVisits,
      totalRewards,
      totalSpent,
      averageVisitFrequency,
      lastVisit: visitHistory[0]?.timestamp || null,
      registeredAt: customer.createdAt,
      visitHistory: visitHistory.map(visit => ({
        _id: visit._id,
        visitDate: visit.timestamp,
        rewardsEarned: visit.rewardEarned,
        amountSpent: 0 // Not tracked in current model
      })),
      rewardHistory: rewardHistory.map(reward => ({
        _id: reward._id,
        rewardType: reward.rewardType,
        earnedAt: reward.issuedAt
      })),
      statistics: {
        averageSpendingPerVisit,
        longestStreak,
        currentStreak,
        monthlyVisits: monthlyVisitsArray
      },
      storeInfo: {
        name: (admin.storeId as any).name,
        address: (admin.storeId as any).address
      },
      receipts: receipts.map((receipt: any) => ({
        _id: receipt._id?.toString() || receipt._id,
        imageUrl: receipt.imageUrl,
        status: receipt.status,
        reason: receipt.reason,
        flags: receipt.flags,
        tin: receipt.tin,
        invoiceNo: receipt.invoiceNo,
        dateOnReceipt: receipt.dateOnReceipt,
        totalAmount: receipt.totalAmount,
        branchText: receipt.branchText,
        ocrText: receipt.ocrText,
        storeId: receipt.storeId ? {
          _id: (receipt.storeId as any)._id?.toString() || (receipt.storeId as any)._id,
          name: (receipt.storeId as any).name,
          address: (receipt.storeId as any).address
        } : null,
        createdAt: receipt.createdAt,
        processedAt: receipt.processedAt
      }))
    };

    return NextResponse.json(customerDetail);

  } catch (error) {
    console.error('Error fetching admin customer detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer detail' },
      { status: 500 }
    );
  }
}

