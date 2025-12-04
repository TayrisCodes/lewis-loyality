import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Visit from '@/models/Visit';
import Customer from '@/models/Customer';
import { requireAdmin, PERMISSIONS } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    const user = await requireAdmin([PERMISSIONS.VIEW_VISITS]);
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    let query: any = { storeId: user.storeId };

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      query.timestamp = { $gte: startOfDay, $lte: endOfDay };
    }

    const visits = await Visit.find(query)
      .populate('customerId', 'name phone')
      .populate('receiptId', 'imageUrl status totalAmount dateOnReceipt invoiceNo')
      .sort({ timestamp: -1 });

    return NextResponse.json(visits);
  } catch (error) {
    console.error('Get visits error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}