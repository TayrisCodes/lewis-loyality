import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Store from '@/models/Store';
import User from '@/models/SystemUser';
import { requireSuperAdmin } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();

    const { id } = await params;
    const store = await Store.findById(id).populate('adminId', 'name email');

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();

    const { id } = await params;
    const { name, address, adminId, isActive, tin } = await request.json();

    if (adminId) {
      const admin = await User.findById(adminId);
      if (!admin || admin.role !== 'admin') {
        return NextResponse.json(
          { error: 'Invalid admin user' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = { name, address, adminId, isActive };
    
    // Handle TIN - can be set or cleared (empty string means remove TIN)
    if (tin !== undefined) {
      updateData.tin = tin && tin.trim() !== '' ? tin.trim() : undefined;
    }

    const store = await Store.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('adminId', 'name email');

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(store);
  } catch (error) {
    console.error('Update store error:', error);
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
    const store = await Store.findById(id);

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    // Unassign admin from store before deleting
    if (store.adminId) {
      await User.findByIdAndUpdate(store.adminId, { storeId: null });
    }

    // Delete the store
    await Store.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Store deleted successfully' });
  } catch (error) {
    console.error('Delete store error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}