import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';
import PushSubscription from '@/models/PushSubscription';
import NotificationPreferences from '@/models/NotificationPreferences';
import Customer from '@/models/Customer';

/**
 * POST /api/customer/push/subscribe
 * 
 * Subscribe a customer to push notifications
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { subscription, phone, userAgent } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: 'Invalid subscription object' },
        { status: 400 }
      );
    }

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
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

    // Check if subscription already exists
    let pushSubscription = await PushSubscription.findOne({
      endpoint: subscription.endpoint,
    });

    if (pushSubscription) {
      // Update existing subscription
      pushSubscription.customerId = customer._id as mongoose.Types.ObjectId;
      pushSubscription.customerPhone = phone;
      pushSubscription.keys = subscription.keys;
      pushSubscription.userAgent = userAgent || request.headers.get('user-agent');
      pushSubscription.isActive = true;
      pushSubscription.expiresAt = subscription.expirationTime
        ? new Date(subscription.expirationTime)
        : undefined;
      await pushSubscription.save();
    } else {
      // Create new subscription
      pushSubscription = await PushSubscription.create({
        customerId: customer._id,
        customerPhone: phone,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent: userAgent || request.headers.get('user-agent'),
        expiresAt: subscription.expirationTime
          ? new Date(subscription.expirationTime)
          : undefined,
        isActive: true,
      });
    }

    // Create default notification preferences if not exists
    const preferences = await NotificationPreferences.findOne({
      customerId: customer._id,
    });

    if (!preferences) {
      await NotificationPreferences.create({
        customerId: customer._id,
        customerPhone: phone,
        receiptAccepted: true,
        receiptRejected: true,
        rewardMilestone: true,
        rewardAvailable: true,
        visitPeriodReminder: true,
        periodReset: true,
        manualReviewComplete: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Push subscription saved successfully',
      subscriptionId: pushSubscription._id,
    });
  } catch (error: any) {
    console.error('[Push] Subscription error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save push subscription' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/customer/push/subscribe
 * 
 * Unsubscribe a customer from push notifications
 */
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');
    const phone = searchParams.get('phone');

    if (!endpoint && !phone) {
      return NextResponse.json(
        { error: 'Either endpoint or phone is required' },
        { status: 400 }
      );
    }

    const query: any = {};
    if (endpoint) {
      query.endpoint = endpoint;
    }
    if (phone) {
      query.customerPhone = phone;
    }

    // Mark subscriptions as inactive
    const result = await PushSubscription.updateMany(
      query,
      { isActive: false }
    );

    return NextResponse.json({
      success: true,
      message: 'Push subscription removed successfully',
      removedCount: result.modifiedCount,
    });
  } catch (error: any) {
    console.error('[Push] Unsubscribe error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove push subscription' },
      { status: 500 }
    );
  }
}

