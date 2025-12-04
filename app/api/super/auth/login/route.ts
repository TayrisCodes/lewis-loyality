import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '@/models/SystemUser';
import { generateToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update last login
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    const token = generateToken({
      userId: (user._id as mongoose.Types.ObjectId).toString(),
      role: user.role,
    });

    // Check if request is over HTTPS to determine secure flag
    // In production behind proxy, check if connection is secure
    const isSecure = request.url.startsWith('https://') || process.env.NODE_ENV !== 'production';
    
    // Create response with JSON data
    const response = NextResponse.json({
      message: 'Login successful',
      token: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    // Set cookie on the response
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: isSecure, // Only require HTTPS if URL is actually HTTPS
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;
  } catch (error) {
    console.error('Super admin login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}