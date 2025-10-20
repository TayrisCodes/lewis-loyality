import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Customer from '@/models/Customer';
import Store from '@/models/Store';
import Visit from '@/models/Visit';
import Reward from '@/models/Reward';
import RewardRule from '@/models/RewardRule';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { phone, storeId, token } = await request.json();

    if (!phone || !storeId || !token) {
      return NextResponse.json(
        { error: 'Phone, store ID, and token are required' },
        { status: 400 }
      );
    }

    // Validate store and token
    const store = await Store.findById(storeId);
    if (!store || !store.isActive || store.qrToken !== token) {
      return NextResponse.json(
        { error: 'Invalid store or token' },
        { status: 400 }
      );
    }

    if (!store.qrExpiresAt || new Date() > store.qrExpiresAt) {
      return NextResponse.json(
        { error: 'QR code has expired' },
        { status: 400 }
      );
    }

    // Get customer
    const customer = await Customer.findOne({ phone: phone.trim() });
    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Check if customer visited within 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentVisit = await Visit.findOne({
      customerId: customer._id,
      timestamp: { $gte: twentyFourHoursAgo },
    });

    if (recentVisit) {
      return NextResponse.json(
        { error: 'You already scanned today. Come back tomorrow.' },
        { status: 429 }
      );
    }

    // Create visit
    const visit = new Visit({
      customerId: customer._id,
      storeId: store._id,
      timestamp: new Date(),
      rewardEarned: false,
    });

    // Check for reward
    const rewardRule = await RewardRule.findOne({
      storeId: store._id,
      isActive: true,
    });

    let rewardEarned = false;
    let reward = null;

    if (rewardRule) {
      const newTotalVisits = customer.totalVisits + 1;
      if (newTotalVisits % rewardRule.visitsNeeded === 0) {
        rewardEarned = true;
        visit.rewardEarned = true;

        // Create reward
        const rewardCode = `LEWIS${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
        reward = new Reward({
          customerId: customer._id,
          storeId: store._id,
          code: rewardCode,
          rewardType: rewardRule.rewardValue,
          issuedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        });
        await reward.save();

        // Send WhatsApp notification
        try {
          await sendWhatsAppMessage(
            customer.phone,
            `🎉 Hi ${customer.name}! You've earned a ${rewardRule.rewardValue}. Show this message at checkout to redeem. Code: ${rewardCode}`
          );
        } catch (error) {
          console.error('WhatsApp notification failed:', error);
        }
      }
    }

    await visit.save();

    // Update customer
    await Customer.findByIdAndUpdate(customer._id, {
      totalVisits: customer.totalVisits + 1,
      lastVisit: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Visit recorded successfully',
      totalVisits: customer.totalVisits + 1,
      rewardEarned,
      reward: reward ? {
        code: reward.code,
        type: reward.rewardType,
        expiresAt: reward.expiresAt,
      } : null,
    });
  } catch (error) {
    console.error('Scan error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}