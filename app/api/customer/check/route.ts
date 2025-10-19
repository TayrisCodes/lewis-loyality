import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Customer from '@/models/Customer';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const customer = await Customer.findOne({ phone: phone.trim() });

    if (customer) {
      return NextResponse.json({
        exists: true,
        name: customer.name,
        totalVisits: customer.totalVisits,
        lastVisit: customer.lastVisit,
      });
    } else {
      return NextResponse.json({
        exists: false,
      });
    }
  } catch (error) {
    console.error('Check customer error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}