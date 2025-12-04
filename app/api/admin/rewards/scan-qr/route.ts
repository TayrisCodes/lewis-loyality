import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Reward from '@/models/Reward';
import SystemUser from '@/models/SystemUser';
import { requireAuth } from '@/lib/auth';
import { sendNotificationToCustomer } from '@/lib/pushNotifications';

/**
 * POST /api/admin/rewards/scan-qr
 * 
 * Admin scans discount QR code to mark reward as used
 * QR code format: JSON string with { type: 'reward_discount', rewardId, discountCode, ... }
 * 
 * Request body:
 * {
 *   qrCodeData: string  // QR code data scanned from customer's device
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const user = await requireAuth();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    
    const body = await request.json();
    const { qrCodeData } = body;
    
    if (!qrCodeData) {
      return NextResponse.json(
        { success: false, error: 'QR code data is required' },
        { status: 400 }
      );
    }
    
    // Parse QR code data
    let qrData: any;
    try {
      qrData = typeof qrCodeData === 'string' ? JSON.parse(qrCodeData) : qrCodeData;
    } catch (parseError) {
      return NextResponse.json(
        { success: false, error: 'Invalid QR code format' },
        { status: 400 }
      );
    }
    
    // Validate QR code type
    if (qrData.type !== 'reward_discount') {
      return NextResponse.json(
        { success: false, error: 'Invalid QR code type. This is not a discount QR code.' },
        { status: 400 }
      );
    }
    
    // Get admin info with store ID
    const admin = await SystemUser.findById(user.userId).populate('storeId');
    const adminStoreId = (admin?.storeId && typeof admin.storeId === 'object' && '_id' in admin.storeId)
      ? (admin.storeId as any)._id
      : admin?.storeId || user.storeId;
    
    // Find reward by rewardId from QR code
    const reward = await Reward.findById(qrData.rewardId)
      .populate('customerId', 'name phone')
      .populate('storeId', 'name');
    
    if (!reward) {
      return NextResponse.json(
        { success: false, error: 'Reward not found. This QR code is invalid.' },
        { status: 404 }
      );
    }
    
    // Verify discount code matches
    if (reward.discountCode !== qrData.discountCode) {
      return NextResponse.json(
        { success: false, error: 'Invalid discount code. This QR code may be old or invalid.' },
        { status: 400 }
      );
    }
    
    // Check if reward is already used
    if (reward.status === 'used') {
      return NextResponse.json(
        { success: false, error: 'This discount QR code has already been used.' },
        { status: 400 }
      );
    }
    
    // Check if reward is in redeemed status (only redeemed rewards can be scanned)
    if (reward.status !== 'redeemed') {
      return NextResponse.json(
        { success: false, error: `This reward is in "${reward.status}" status. Only redeemed rewards can be scanned.` },
        { status: 400 }
      );
    }
    
    // Check if reward has expired
    if (reward.expiresAt && new Date() > reward.expiresAt) {
      reward.status = 'expired';
      await reward.save();
      
      return NextResponse.json(
        { success: false, error: 'This discount QR code has expired.' },
        { status: 400 }
      );
    }
    
    // Get customer info
    const customerId = typeof reward.customerId === 'object' && reward.customerId !== null && '_id' in reward.customerId
      ? (reward.customerId as any)._id
      : reward.customerId;
    const customerName = typeof reward.customerId === 'object' && reward.customerId !== null && 'name' in reward.customerId
      ? (reward.customerId as any).name
      : '';
    const customerPhone = typeof reward.customerId === 'object' && reward.customerId !== null && 'phone' in reward.customerId
      ? (reward.customerId as any).phone
      : '';
    
    // Get store name
    const storeName = typeof reward.storeId === 'object' && reward.storeId !== null && 'name' in reward.storeId
      ? (reward.storeId as any).name
      : '';
    
    // Update reward to "used" status with tracking info
    reward.status = 'used';
    reward.usedAt = new Date();
    reward.usedByAdminId = user.userId as any;
    if (adminStoreId) {
      reward.usedAtStoreId = adminStoreId as any;
    }
    await reward.save();
    
    console.log(`✅ Discount QR code scanned: Reward ${reward.code} marked as used by admin ${user.userId} at store ${adminStoreId}`);
    
    // Send notification to customer
    if (customerId) {
      try {
        await sendNotificationToCustomer(
          customerId,
          {
            title: 'Discount Applied! 🎉',
            body: `Thank you! Your ${reward.discountPercent || 10}% discount has been successfully applied. We appreciate your loyalty!`,
            icon: '/Lewis_Retails_logo_2.png',
            badge: '/Lewis_Retails_logo_2.png',
            tag: `discount-used-${reward._id}`,
            requireInteraction: false,
          },
          'rewardUsed'
        );
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
        // Don't fail the request if notification fails
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Discount successfully applied! ${reward.discountPercent || 10}% discount has been given to ${customerName}.`,
      data: {
        rewardId: reward._id,
        code: reward.code,
        status: reward.status,
        usedAt: reward.usedAt,
        customer: {
          name: customerName,
          phone: customerPhone,
        },
        store: {
          name: storeName,
        },
        discountPercent: reward.discountPercent || 10,
        usedBy: {
          adminId: String(user.userId),
          storeId: String(adminStoreId),
        },
      },
    });
    
  } catch (error: any) {
    console.error('Error scanning discount QR code:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to scan discount QR code' },
      { status: 500 }
    );
  }
}

