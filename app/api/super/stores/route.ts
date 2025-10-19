import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Store from '@/models/Store';
import User from '@/models/SystemUser';
import { requireSuperAdmin, PERMISSIONS } from '@/lib/auth';
import { generateQRToken, generateQRImage, generateQRUrl } from '@/lib/qr-generator';

export async function GET() {
  try {
    await dbConnect();
    await requireSuperAdmin([PERMISSIONS.VIEW_ALL_STORES]);

    const stores = await Store.find()
      .populate('adminId', 'name email')
      .sort({ createdAt: -1 });

    return NextResponse.json(stores);
  } catch (error) {
    console.error('Get stores error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    await requireSuperAdmin([PERMISSIONS.CREATE_STORE]);

    const { name, address, adminId } = await request.json();

    if (!name || !address) {
      return NextResponse.json(
        { error: 'Name and address are required' },
        { status: 400 }
      );
    }

    if (adminId) {
      const admin = await User.findById(adminId);
      if (!admin || admin.role !== 'admin') {
        return NextResponse.json(
          { error: 'Invalid admin user' },
          { status: 400 }
        );
      }
    }

    // Generate initial QR
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setHours(0, 0, 0, 0);

    const store = new Store({
      name,
      address,
      adminId,
    });

    // Save first to get the _id
    await store.save();

    const storeId = (store._id as any).toString();
    const token = generateQRToken(storeId, today);
    const qrUrl = generateQRUrl(storeId, token, today);
    const qrImageUrl = await generateQRImage(token, storeId, today);

    store.qrToken = token;
    store.qrUrl = qrUrl;
    store.qrExpiresAt = tomorrow;

    // Update with QR info
    await store.save();

    return NextResponse.json(store, { status: 201 });
  } catch (error) {
    console.error('Create store error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}