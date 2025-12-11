import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import SystemUser from '@/models/SystemUser';
import { requireAuth } from '@/lib/auth';

export async function PUT(request: NextRequest) {
  try {
    // Get the current authenticated user (superadmin or admin)
    const currentUser = await requireAuth();
    await dbConnect();

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Find the user (including passwordHash)
    const user = await SystemUser.findById(currentUser.userId).select('+passwordHash');
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await SystemUser.findByIdAndUpdate(
      currentUser.userId,
      { passwordHash: hashedPassword }
    );

    return NextResponse.json({ 
      message: 'Password changed successfully',
      success: true 
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    
    // Handle auth errors
    if (error.message === 'Unauthorized' || error.message === 'Insufficient permissions') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

