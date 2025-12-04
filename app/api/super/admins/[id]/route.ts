import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import bcrypt from 'bcryptjs';
import User from '@/models/SystemUser';
import Store from '@/models/Store';
import { requireSuperAdmin } from '@/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    await requireSuperAdmin();

    const { id } = await params;
    const { name, email, phone, storeId, isActive } = await request.json();

    // Get current admin to check current store assignment
    const currentAdmin = await User.findById(id);
    if (!currentAdmin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    const currentStoreId = currentAdmin.storeId?.toString();

    // Handle store reassignment
    if (storeId && storeId !== currentStoreId) {
      // Check if new store exists
      const newStore = await Store.findById(storeId);
      if (!newStore) {
        return NextResponse.json(
          { error: 'Store not found' },
          { status: 400 }
        );
      }

      // Check if new store already has an admin (and it's not the current admin)
      if (newStore.adminId && newStore.adminId.toString() !== id) {
        return NextResponse.json(
          { error: 'This store already has an admin assigned' },
          { status: 400 }
        );
      }

      // Unassign from old store
      if (currentStoreId) {
        await Store.findByIdAndUpdate(currentStoreId, { adminId: null });
      }

      // Assign to new store
      await Store.findByIdAndUpdate(storeId, { adminId: id });
    } else if (!storeId && currentStoreId) {
      // Unassign from current store if storeId is empty
      await Store.findByIdAndUpdate(currentStoreId, { adminId: null });
    }

    // Update admin
    const updateData: any = { name, email: email?.toLowerCase(), phone, isActive };
    if (storeId !== undefined) {
      updateData.storeId = storeId || null;
    }

    const admin = await User.findByIdAndUpdate(
      id,
      updateData,
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
    await dbConnect();
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