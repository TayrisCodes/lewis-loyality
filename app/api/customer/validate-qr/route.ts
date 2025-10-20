import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Store from '@/models/Store';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { storeId, token } = await request.json();

    if (!storeId || !token) {
      return NextResponse.json(
        { error: 'Store ID and token are required' },
        { status: 400 }
      );
    }

    const store = await Store.findById(storeId);
    if (!store || !store.isActive) {
      return NextResponse.json(
        { error: 'Store not found or inactive' },
        { status: 404 }
      );
    }

    if (store.qrToken !== token) {
      return NextResponse.json(
        { error: 'Invalid QR token' },
        { status: 400 }
      );
    }

    if (!store.qrExpiresAt || new Date() > store.qrExpiresAt) {
      return NextResponse.json(
        { error: 'QR code has expired' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      store: {
        id: store._id,
        name: store.name,
        address: store.address,
      },
    });
  } catch (error) {
    console.error('Validate QR error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}