import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Store from '@/models/Store';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  try {
    await dbConnect();
    const user = await requireAdmin();

    const store = await Store.findById(user.storeId);
    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(store);
  } catch (error) {
    console.error('Get store error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}