import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Store from '@/models/Store';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/super/system-control
 * Get system-wide control settings (all stores' QR/Receipt status)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify super admin authentication
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized - Super admin only' }, { status: 401 });
    }

    await connectDB();

    // Get all stores with their control settings
    const stores = await Store.find({ isActive: true })
      .select('_id name address allowQrScanning allowReceiptUploads')
      .sort({ name: 1 });

    // Calculate system-wide statistics
    const totalStores = stores.length;
    const qrEnabledCount = stores.filter(s => s.allowQrScanning !== false).length;
    const receiptEnabledCount = stores.filter(s => s.allowReceiptUploads !== false).length;

    return NextResponse.json({
      stores,
      statistics: {
        totalStores,
        qrEnabled: qrEnabledCount,
        qrDisabled: totalStores - qrEnabledCount,
        receiptEnabled: receiptEnabledCount,
        receiptDisabled: totalStores - receiptEnabledCount,
      }
    });

  } catch (error) {
    console.error('Error fetching system control:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system control settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/super/system-control
 * Update system control settings (individual store or bulk)
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify super admin authentication
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized - Super admin only' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const { action, storeId, allowQrScanning, allowReceiptUploads } = body;

    // Validate action
    if (!action || !['single', 'bulk'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "single" or "bulk"' },
        { status: 400 }
      );
    }

    let result;

    if (action === 'single') {
      // Update single store
      if (!storeId) {
        return NextResponse.json(
          { error: 'storeId is required for single store update' },
          { status: 400 }
        );
      }

      const updateData: any = {};
      if (typeof allowQrScanning === 'boolean') {
        updateData.allowQrScanning = allowQrScanning;
      }
      if (typeof allowReceiptUploads === 'boolean') {
        updateData.allowReceiptUploads = allowReceiptUploads;
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { error: 'No valid updates provided' },
          { status: 400 }
        );
      }

      result = await Store.findByIdAndUpdate(
        storeId,
        { $set: updateData },
        { new: true }
      ).select('_id name allowQrScanning allowReceiptUploads');

      if (!result) {
        return NextResponse.json(
          { error: 'Store not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        message: 'Store settings updated successfully',
        store: result
      });

    } else if (action === 'bulk') {
      // Update all active stores
      const updateData: any = {};
      if (typeof allowQrScanning === 'boolean') {
        updateData.allowQrScanning = allowQrScanning;
      }
      if (typeof allowReceiptUploads === 'boolean') {
        updateData.allowReceiptUploads = allowReceiptUploads;
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { error: 'No valid updates provided' },
          { status: 400 }
        );
      }

      result = await Store.updateMany(
        { isActive: true },
        { $set: updateData }
      );

      return NextResponse.json({
        message: 'All stores updated successfully',
        modifiedCount: result.modifiedCount
      });
    }

  } catch (error) {
    console.error('Error updating system control:', error);
    return NextResponse.json(
      { error: 'Failed to update system control settings' },
      { status: 500 }
    );
  }
}

