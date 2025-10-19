import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import User from '@/models/SystemUser';
import Store from '@/models/Store';
import { requireSuperAdmin } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();

    const { id } = await params;
    const { name, email, phone, storeId, isActive } = await request.json();

    if (storeId) {
      const store = await Store.findById(storeId);
      if (!store) {
        return NextResponse.json(
          { error: 'Store not found' },
          { status: 400 }
        );
      }
    }

    const admin = await User.findByIdAndUpdate(
      id,
      { name, email: email?.toLowerCase(), phone, storeId, isActive },
      { new: true }
    ).populate('storeId', 'name address');

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(admin);
  } catch (error) {
    console.error('Update admin error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();

    const { id } = await params;
    const admin = await User.findById(id);
    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Remove admin from store
    await Store.findByIdAndUpdate(admin.storeId, { adminId: null });

    await User.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Delete admin error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}