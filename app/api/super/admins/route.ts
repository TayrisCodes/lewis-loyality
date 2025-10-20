import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import bcrypt from 'bcryptjs';
import User from '@/models/SystemUser';
import Store from '@/models/Store';
import { requireSuperAdmin, PERMISSIONS } from '@/lib/auth';

export async function GET() {
  try {
    await dbConnect();
    await requireSuperAdmin([PERMISSIONS.VIEW_ALL_ADMINS]);

    const admins = await User.find({ role: 'admin' })
      .populate('storeId', 'name address')
      .sort({ createdAt: -1 });

    return NextResponse.json(admins);
  } catch (error) {
    console.error('Get admins error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    await requireSuperAdmin([PERMISSIONS.CREATE_ADMIN]);

    const { name, email, password, storeId } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (!storeId) {
      return NextResponse.json(
        { error: 'Store assignment is required for admin users' },
        { status: 400 }
      );
    }

    const store = await Store.findById(storeId);
    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 400 }
      );
    }

    // Check if store already has an admin
    if (store.adminId) {
      return NextResponse.json(
        { error: 'This store already has an admin assigned' },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = new User({
      name,
      email: email.toLowerCase(),
      passwordHash: hashedPassword,
      role: 'admin',
      storeId,
      isActive: true,
    });

    await admin.save();

    // Update store with admin
    await Store.findByIdAndUpdate(storeId, { adminId: admin._id });

    return NextResponse.json({
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      storeId: admin.storeId,
    }, { status: 201 });
  } catch (error) {
    console.error('Create admin error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}