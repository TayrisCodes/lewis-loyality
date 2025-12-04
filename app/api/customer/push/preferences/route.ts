import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import NotificationPreferences from '@/models/NotificationPreferences';
import Customer from '@/models/Customer';

/**
 * GET /api/customer/push/preferences
 * 
 * Get notification preferences for a customer
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone');
    const customerId = searchParams.get('customerId');

    if (!phone && !customerId) {
      return NextResponse.json(
        { error: 'Phone or customerId is required' },
        { status: 400 }
      );
    }

    let preferences = null;

    if (phone) {
      preferences = await NotificationPreferences.findOne({ customerPhone: phone });
    } else if (customerId) {
      preferences = await NotificationPreferences.findOne({ customerId });
    }

    if (!preferences) {
      // Return default preferences
      return NextResponse.json({
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
      receiptAccepted: preferences.receiptAccepted,
      receiptRejected: preferences.receiptRejected,
      rewardMilestone: preferences.rewardMilestone,
      rewardAvailable: preferences.rewardAvailable,
      visitPeriodReminder: preferences.visitPeriodReminder,
      periodReset: preferences.periodReset,
      manualReviewComplete: preferences.manualReviewComplete,
    });
  } catch (error: any) {
    console.error('[Push] Get preferences error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get notification preferences' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/customer/push/preferences
 * 
 * Update notification preferences for a customer
 */
export async function PUT(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { phone, customerId, ...preferences } = body;

    if (!phone && !customerId) {
      return NextResponse.json(
        { error: 'Phone or customerId is required' },
        { status: 400 }
      );
    }

    // Find customer
    let customer = null;
    if (phone) {
      customer = await Customer.findOne({ phone });
    } else if (customerId) {
      customer = await Customer.findById(customerId);
    }

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Update or create preferences
    const updatedPreferences = await NotificationPreferences.findOneAndUpdate(
      { customerId: customer._id },
      {
        customerId: customer._id,
        customerPhone: customer.phone,
        receiptAccepted: preferences.receiptAccepted ?? true,
        receiptRejected: preferences.receiptRejected ?? true,
        rewardMilestone: preferences.rewardMilestone ?? true,
        rewardAvailable: preferences.rewardAvailable ?? true,
        visitPeriodReminder: preferences.visitPeriodReminder ?? true,
        periodReset: preferences.periodReset ?? true,
        manualReviewComplete: preferences.manualReviewComplete ?? true,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Notification preferences updated successfully',
      preferences: {
        receiptAccepted: updatedPreferences.receiptAccepted,
        receiptRejected: updatedPreferences.receiptRejected,
        rewardMilestone: updatedPreferences.rewardMilestone,
        rewardAvailable: updatedPreferences.rewardAvailable,
        visitPeriodReminder: updatedPreferences.visitPeriodReminder,
        periodReset: updatedPreferences.periodReset,
        manualReviewComplete: updatedPreferences.manualReviewComplete,
      },
    });
  } catch (error: any) {
    console.error('[Push] Update preferences error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}




