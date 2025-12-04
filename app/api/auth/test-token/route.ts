import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { verifyToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    const cookieToken = request.cookies.get('auth-token')?.value;
    
    const JWT_SECRET = process.env.JWT_SECRET;
    
    return NextResponse.json({
      hasJwtSecret: !!JWT_SECRET,
      jwtSecretPrefix: JWT_SECRET ? JWT_SECRET.substring(0, 10) + '...' : null,
      hasCookieToken: !!cookieToken,
      cookieTokenPrefix: cookieToken ? cookieToken.substring(0, 20) + '...' : null,
      providedToken: token ? token.substring(0, 20) + '...' : null,
      verifyResult: token ? verifyToken(token) : null,
      cookieVerifyResult: cookieToken ? verifyToken(cookieToken) : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

