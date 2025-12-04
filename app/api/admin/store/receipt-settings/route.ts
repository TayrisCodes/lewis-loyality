import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import dbConnect from '@/lib/db';
import Store from '@/models/Store';

/**
 * GET /api/admin/store/receipt-settings
 * 
 * Get current receipt settings for admin's store
 * 
 * Auth: Required (admin or superadmin)
 * 
 * Response:
 * {
 *   storeId: string,
 *   storeName: string,
 *   settings: {
 *     tin: string,
 *     branchName: string,
 *     minReceiptAmount: number,
 *     receiptValidityHours: number,
 *     allowReceiptUploads: boolean
 *   }
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    
    // Get storeId from query (for superadmin) or user (for admin)
    const { searchParams } = new URL(request.url);
    const storeIdParam = searchParams.get('storeId');
    
    let storeId: string;
    
    if (user.role === 'superadmin' && storeIdParam) {
      storeId = storeIdParam;
    } else if (user.role === 'admin' && user.storeId) {
      storeId = user.storeId;
    } else {
      return NextResponse.json(
        { error: 'Store ID required' },
        { status: 400 }
      );
    }
    
    // Get store
    const store = await Store.findById(storeId);
    
    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      storeId: String(store._id),
      storeName: store.name,
      settings: {
        tin: store.tin || '',
        branchName: store.branchName || '',
        minReceiptAmount: store.minReceiptAmount || 500,
        receiptValidityHours: store.receiptValidityHours || 24,
        allowReceiptUploads: store.allowReceiptUploads !== false,
      },
    });
    
  } catch (error) {
    console.error('Get receipt settings error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/store/receipt-settings
 * 
 * Update receipt settings for store
 * 
 * Auth: Required (admin or superadmin)
 * 
 * Body:
 * {
 *   storeId?: string,  // Required for superadmin, ignored for admin
 *   tin?: string,
 *   branchName?: string,
 *   minReceiptAmount?: number,
 *   receiptValidityHours?: number,
 *   allowReceiptUploads?: boolean
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   message: "Settings updated successfully",
 *   settings: { ... }
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    
    const body = await request.json();
    
    // Determine which store to update
    let storeId: string;
    
    if (user.role === 'superadmin' && body.storeId) {
      storeId = body.storeId;
    } else if (user.role === 'admin' && user.storeId) {
      storeId = user.storeId;
    } else {
      return NextResponse.json(
        { error: 'Store ID required' },
        { status: 400 }
      );
    }
    
    console.log(`\n⚙️  Updating receipt settings for store: ${storeId}`);
    console.log(`   Admin: ${user.email}`);
    
    // Get store
    const store = await Store.findById(storeId);
    
    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }
    
    // Update fields if provided
    if (body.tin !== undefined) {
      store.tin = body.tin.trim();
      console.log(`   ✓ TIN: ${store.tin}`);
    }
    
    if (body.branchName !== undefined) {
      store.branchName = body.branchName.trim();
      console.log(`   ✓ Branch: ${store.branchName}`);
    }
    
    if (body.minReceiptAmount !== undefined) {
      const amount = Number(body.minReceiptAmount);
      if (isNaN(amount) || amount < 0) {
        return NextResponse.json(
          { error: 'Invalid minimum amount' },
          { status: 400 }
        );
      }
      store.minReceiptAmount = amount;
      console.log(`   ✓ Min Amount: ${store.minReceiptAmount} ETB`);
    }
    
    if (body.receiptValidityHours !== undefined) {
      const hours = Number(body.receiptValidityHours);
      if (isNaN(hours) || hours < 1 || hours > 168) { // Max 1 week
        return NextResponse.json(
          { error: 'Invalid validity hours (must be 1-168)' },
          { status: 400 }
        );
      }
      store.receiptValidityHours = hours;
      console.log(`   ✓ Validity: ${store.receiptValidityHours} hours`);
    }
    
    if (body.allowReceiptUploads !== undefined) {
      store.allowReceiptUploads = Boolean(body.allowReceiptUploads);
      console.log(`   ✓ Uploads: ${store.allowReceiptUploads ? 'Enabled' : 'Disabled'}`);
    }
    
    await store.save();
    
    console.log('   ✅ Settings updated successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Receipt settings updated successfully',
      settings: {
        tin: store.tin,
        branchName: store.branchName,
        minReceiptAmount: store.minReceiptAmount,
        receiptValidityHours: store.receiptValidityHours,
        allowReceiptUploads: store.allowReceiptUploads,
      },
    });
    
  } catch (error) {
    console.error('Update receipt settings error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

