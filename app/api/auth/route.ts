import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SystemUser from "@/models/SystemUser";
import { comparePassword, generateToken, verifyToken, extractTokenFromHeader } from "@/lib/auth";
import { cookies } from 'next/headers';

/**
 * POST /api/auth - Admin Login
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await SystemUser.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { error: "Account is inactive" },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await comparePassword(password, user.passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const userId = (user._id as any).toString();
    const token = generateToken({
      userId,
      email: user.email,
      id: userId,
      role: user.role,
      storeId: user.storeId?.toString(),
    });

    // Create response and set the auth token as a cookie (CRITICAL for authentication to work)
    const response = NextResponse.json({
      success: true,
      token,
      admin: {
        id: userId,
        email: user.email,
        name: user.name,
        role: user.role,
        storeId: user.storeId,
      },
    });

    // Set the cookie on the response
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth - Verify Token
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ valid: false, error: "No token provided" }, { status: 401 });
    }

    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json({ valid: false, error: "Invalid token" }, { status: 401 });
    }

    return NextResponse.json({
      valid: true,
      user: {
        email: payload.email || '',
        id: payload.id || payload.userId,
        role: payload.role,
        storeId: payload.storeId,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { valid: false, error: "Invalid token" },
      { status: 401 }
    );
  }
}



