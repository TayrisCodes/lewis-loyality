import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Reward from '@/models/Reward';
import Customer from '@/models/Customer';

/**
 * POST /api/customer/rewards/claim
 * 
 * Customer claims a pending reward
 * Changes reward status from "pending" to "claimed"
 * 
 * Request body:
 * {
 *   phone: string,
 *   rewardId: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { phone, rewardId } = body;
    
    if (!phone || !rewardId) {
      return NextResponse.json(
        { success: false, error: 'Phone and rewardId are required' },
        { status: 400 }
      );
    }
    
    // Find customer
    const customer = await Customer.findOne({ phone });
    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }
    
    // Find reward
    const reward = await Reward.findOne({
      _id: rewardId,
      customerId: customer._id,
      status: 'pending',
    });
    
    if (!reward) {
      return NextResponse.json(
        { success: false, error: 'Reward not found or already claimed' },
        { status: 404 }
      );
    }
    
    // Check if reward has expired
    if (reward.expiresAt && new Date() > reward.expiresAt) {
      reward.status = 'expired';
      await reward.save();
      
      return NextResponse.json(
        { success: false, error: 'This reward has expired' },
        { status: 400 }
      );
    }
    
    // Update reward to "claimed" status
    reward.status = 'claimed';
    reward.claimedAt = new Date();
    await reward.save();
    
    console.log(`✅ Reward ${reward.code} claimed by customer ${phone}`);
    
    return NextResponse.json({
      success: true,
      message: 'Reward claimed successfully. Admin will process it.',
      data: {
        rewardId: reward._id,
        code: reward.code,
        status: reward.status,
        claimedAt: reward.claimedAt,
      },
    });
    
  } catch (error: any) {
    console.error('Error claiming reward:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to claim reward' },
      { status: 500 }
    );
  }
}

