import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Store from '@/models/Store';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/super/receipt-settings
 * Get receipt settings for all stores
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

    // Get all stores with their receipt settings
    const stores = await Store.find({ isActive: true })
      .select('_id name address tin branchName minReceiptAmount receiptValidityHours allowReceiptUploads')
      .sort({ name: 1 });

    // Calculate statistics
    const totalStores = stores.length;
    const avgMinAmount = stores.reduce((sum, s) => sum + (s.minReceiptAmount || 0), 0) / totalStores;
    const avgValidityHours = stores.reduce((sum, s) => sum + (s.receiptValidityHours || 0), 0) / totalStores;
    
    // Find most common TIN
    const tinCounts = stores.reduce((acc: any, s) => {
      if (s.tin) {
        acc[s.tin] = (acc[s.tin] || 0) + 1;
      }
      return acc;
    }, {});
    const mostCommonTin = Object.keys(tinCounts).reduce((a, b) => 
      tinCounts[a] > tinCounts[b] ? a : b, Object.keys(tinCounts)[0] || '');

    return NextResponse.json({
      stores,
      statistics: {
        totalStores,
        avgMinAmount: Math.round(avgMinAmount),
        avgValidityHours: Math.round(avgValidityHours),
        mostCommonTin,
        storesWithTin: stores.filter(s => s.tin).length,
        storesWithoutTin: stores.filter(s => !s.tin).length,
      }
    });

  } catch (error) {
    console.error('Error fetching receipt settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch receipt settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/super/receipt-settings
 * Update receipt settings (single store or bulk)
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
    const { action, storeId, storeIds, settings } = body;

    // Validate action
    if (!action || !['single', 'bulk', 'selected'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "single", "bulk", or "selected"' },
        { status: 400 }
      );
    }

    // Validate settings object
    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Settings object is required' },
        { status: 400 }
      );
    }

    // Build update object (only include provided fields)
    const updateData: any = {};
    if (settings.tin !== undefined && settings.tin !== null) {
      updateData.tin = settings.tin;
    }
    if (settings.branchName !== undefined && settings.branchName !== null) {
      updateData.branchName = settings.branchName;
    }
    if (typeof settings.minReceiptAmount === 'number') {
      updateData.minReceiptAmount = settings.minReceiptAmount;
    }
    if (typeof settings.receiptValidityHours === 'number') {
      updateData.receiptValidityHours = settings.receiptValidityHours;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid settings provided' },
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

      result = await Store.findByIdAndUpdate(
        storeId,
        { $set: updateData },
        { new: true }
      ).select('_id name tin branchName minReceiptAmount receiptValidityHours');

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
      result = await Store.updateMany(
        { isActive: true },
        { $set: updateData }
      );

      return NextResponse.json({
        message: 'All stores updated successfully',
        modifiedCount: result.modifiedCount
      });

    } else if (action === 'selected') {
      // Update selected stores
      if (!storeIds || !Array.isArray(storeIds) || storeIds.length === 0) {
        return NextResponse.json(
          { error: 'storeIds array is required for selected stores update' },
          { status: 400 }
        );
      }

      result = await Store.updateMany(
        { _id: { $in: storeIds }, isActive: true },
        { $set: updateData }
      );

      return NextResponse.json({
        message: `${result.modifiedCount} stores updated successfully`,
        modifiedCount: result.modifiedCount
      });
    }

  } catch (error) {
    console.error('Error updating receipt settings:', error);
    return NextResponse.json(
      { error: 'Failed to update receipt settings' },
      { status: 500 }
    );
  }
}

