import { NextRequest, NextResponse } from 'next/server';
import { getReceiptDetails } from '@/lib/receiptValidator';

/**
 * GET /api/receipts/status/:receiptId
 * 
 * Check the status of a submitted receipt
 * 
 * Public endpoint - no authentication required
 * Customers can check their receipt status
 * 
 * Response:
 * {
 *   receiptId: string,
 *   status: "pending" | "approved" | "rejected" | "flagged",
 *   reason: string,
 *   visitCounted: boolean,
 *   visitCount?: number,
 *   rewardEarned?: boolean,
 *   submittedAt: string,
 *   processedAt?: string
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> }
) {
  try {
    const { receiptId } = await params;
    
    if (!receiptId) {
      return NextResponse.json(
        { error: 'Receipt ID is required' },
        { status: 400 }
      );
    }
    
    console.log(`📋 Checking status for receipt: ${receiptId}`);
    
    // Get receipt details
    const receipt = await getReceiptDetails(receiptId);
    
    if (!receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }
    
    // Determine if visit was counted
    const visitCounted = receipt.status === 'approved';
    
    // Build response
    const response = {
      receiptId: String(receipt._id),
      status: receipt.status,
      reason: receipt.reason,
      visitCounted,
      submittedAt: receipt.createdAt,
      processedAt: receipt.processedAt,
      
      // Parsed data (for debugging/display)
      parsedData: {
        tin: receipt.tin,
        invoiceNo: receipt.invoiceNo,
        date: receipt.dateOnReceipt,
        amount: receipt.totalAmount,
        branch: receipt.branchText,
      },
      
      // Flags (if any)
      flags: receipt.flags || [],
      
      // Store info
      store: receipt.storeId ? {
        name: (receipt.storeId as any).name,
        address: (receipt.storeId as any).address,
      } : undefined,
    };
    
    console.log(`   ✅ Status: ${receipt.status}`);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Status check error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

