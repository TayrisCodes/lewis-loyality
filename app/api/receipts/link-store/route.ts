import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Receipt from '@/models/Receipt';
import Store from '@/models/Store';
import { validateAndProcessReceipt } from '@/lib/receiptValidator';
import { getReceiptImage } from '@/lib/storage';

/**
 * POST /api/receipts/link-store
 * Link a receipt to a selected store and complete validation
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const body = await request.json();
    const { receiptId, storeId, customerPhone } = body;
    
    if (!receiptId || !storeId) {
      return NextResponse.json(
        { error: 'Receipt ID and Store ID are required' },
        { status: 400 }
      );
    }
    
    // Find the receipt
    const receipt = await Receipt.findById(receiptId);
    if (!receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }
    
    // Verify receipt is waiting for store selection
    if (receipt.status !== 'pending' && receipt.status !== 'needs_store_selection') {
      return NextResponse.json(
        { error: 'Receipt is not waiting for store selection' },
        { status: 400 }
      );
    }
    
    // Find the store
    const store = await Store.findById(storeId);
    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }
    
    // Verify store is active and allows receipt uploads
    if (!store.isActive) {
      return NextResponse.json(
        { error: 'Store is not active' },
        { status: 400 }
      );
    }
    
    if (!store.allowReceiptUploads) {
      return NextResponse.json(
        { error: 'Receipt uploads are disabled for this store' },
        { status: 400 }
      );
    }
    
    // Read the receipt image file using storage helper
    let imageBuffer: Buffer;
    try {
      imageBuffer = await getReceiptImage(receipt.imageUrl);
    } catch (err: any) {
      console.error('Error reading receipt image:', err);
      return NextResponse.json(
        { error: 'Receipt image not found. Please upload the receipt again.' },
        { status: 404 }
      );
    }
    
    // Link receipt to store and re-run validation with store ID
    receipt.storeId = storeId;
    
    const path = require('path');
    
    // Re-run validation with store ID
    const validationResult = await validateAndProcessReceipt({
      imageBuffer,
      originalFilename: path.basename(receipt.imageUrl),
      customerPhone: customerPhone || receipt.customerPhone,
      storeId: String(storeId),
    });
    
    // Update receipt with validation result
    if (validationResult.success) {
      // After store linking, status should be approved or flagged, never needs_store_selection
      const finalStatus = validationResult.status === 'needs_store_selection' 
        ? 'approved' 
        : (validationResult.status || 'approved');
      receipt.status = finalStatus;
      receipt.reason = validationResult.reason || undefined;
      receipt.processedAt = new Date();
      
      if (finalStatus === 'approved') {
        receipt.flags = [];
      } else if (finalStatus === 'flagged') {
        receipt.flags = validationResult.flags || [];
      }
      
      await receipt.save();
      
      return NextResponse.json({
        success: true,
        status: validationResult.status,
        reason: validationResult.reason,
        receiptId: String(receipt._id),
        visitCount: validationResult.visitCount,
        rewardEarned: validationResult.rewardEarned,
        data: validationResult,
      });
    } else {
      // Validation failed - update receipt with rejection/flag
      // After store linking, status should be rejected or flagged, never needs_store_selection
      const finalStatus = validationResult.status === 'needs_store_selection'
        ? 'rejected'
        : (validationResult.status || 'rejected');
      receipt.status = finalStatus;
      receipt.reason = validationResult.reason || undefined;
      receipt.processedAt = new Date();
      receipt.flags = validationResult.flags || [];
      
      await receipt.save();
      
      return NextResponse.json({
        success: false,
        status: validationResult.status,
        reason: validationResult.reason,
        rejectionDetails: validationResult.rejectionDetails,
        receiptId: String(receipt._id),
      }, { status: 400 });
    }
    
  } catch (error: any) {
    console.error('Error linking receipt to store:', error);
    return NextResponse.json(
      { error: 'Failed to link receipt to store', details: error.message },
      { status: 500 }
    );
  }
}

