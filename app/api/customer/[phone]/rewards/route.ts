import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Customer from '@/models/Customer';
import Store from '@/models/Store';

/**
 * GET /api/customer/[phone]/rewards - Get customer rewards
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    await dbConnect();

    const { phone } = await params;

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Find customer with rewards and populate store information
    const customer = await Customer.findOne({ phone })
      .populate('rewards.storeId', 'name address')
      .lean();

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Format rewards with store information
    const formattedRewards = customer.rewards?.map((reward: any) => ({
      id: reward._id,
      storeName: reward.storeId?.name || 'Unknown Store',
      storeAddress: reward.storeId?.address || '',
      rewardType: reward.rewardType || 'Lewis Gift Card',
      dateIssued: reward.dateIssued,
      status: reward.status || 'unused',
      expiresAt: reward.expiresAt,
    })) || [];

    return NextResponse.json({
      success: true,
      customer: {
        name: customer.name,
        phone: customer.phone,
        totalRewards: formattedRewards.length,
        unusedRewards: formattedRewards.filter((r: any) => r.status === 'unused').length,
        usedRewards: formattedRewards.filter((r: any) => r.status === 'used').length,
        expiredRewards: formattedRewards.filter((r: any) => r.status === 'expired').length,
      },
      rewards: formattedRewards,
    });
  } catch (error) {
    console.error('Get customer rewards error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customer/[phone]/rewards - Mark reward as used
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    await dbConnect();

    const { phone } = await params;
    const body = await request.json();
    const { rewardId } = body;

    if (!phone || !rewardId) {
      return NextResponse.json(
        { error: 'Phone number and reward ID are required' },
        { status: 400 }
      );
    }

    // Find customer
    const customer = await Customer.findOne({ phone });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Find and update the reward
    const reward = customer.rewards?.find((r: any) => r._id.toString() === rewardId);
    
    if (!reward) {
      return NextResponse.json(
        { error: 'Reward not found' },
        { status: 404 }
      );
    }

    if (reward.status === 'used') {
      return NextResponse.json(
        { error: 'Reward already used' },
        { status: 400 }
      );
    }

    if (reward.status === 'expired') {
      return NextResponse.json(
        { error: 'Reward has expired' },
        { status: 400 }
      );
    }

    // Mark reward as used
    reward.status = 'used';
    reward.usedAt = new Date();

    await customer.save();

    return NextResponse.json({
      success: true,
      message: 'Reward marked as used',
      reward: {
        id: reward._id,
        rewardType: reward.rewardType,
        status: reward.status,
        usedAt: reward.usedAt,
      },
    });
  } catch (error) {
    console.error('Mark reward as used error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
