import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Receipt from '@/models/Receipt';

/**
 * GET /api/customer/receipt/eligibility
 * 
 * Check if customer can upload a receipt (24-hour visit limit)
 * 
 * Query params:
 * - phone: Customer phone number (required)
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get('phone');
    
    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }
    
    // Check for approved receipt within last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentApprovedReceipt = await Receipt.findOne({
      customerPhone: phone,
      status: 'approved',
      processedAt: {
        $gte: twentyFourHoursAgo,
      },
    }).sort({ processedAt: -1 });
    
    if (recentApprovedReceipt && recentApprovedReceipt.processedAt) {
      const hoursSinceLastVisit = Math.round(
        (Date.now() - recentApprovedReceipt.processedAt.getTime()) / (1000 * 60 * 60)
      );
      const remainingHours = Math.ceil(24 - hoursSinceLastVisit);
      
      return NextResponse.json({
        success: true,
        canUpload: false,
        reason: `You already submitted an approved receipt ${hoursSinceLastVisit} hours ago.`,
        remainingHours,
        lastVisitTime: recentApprovedReceipt.processedAt,
        message: `Please wait ${remainingHours} more hours before submitting another receipt.`,
      });
    }
    
    return NextResponse.json({
      success: true,
      canUpload: true,
      message: 'You can upload a receipt now.',
    });
    
  } catch (error: any) {
    console.error('Error checking receipt eligibility:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to check eligibility' },
      { status: 500 }
    );
  }
}

