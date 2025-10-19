import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Customer from '@/models/Customer';

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { name, phone } = await request.json();

    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Name and phone are required' },
        { status: 400 }
      );
    }

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({ phone: phone.trim() });
    if (existingCustomer) {
      return NextResponse.json(
        { error: 'Customer with this phone number already exists' },
        { status: 400 }
      );
    }

    const customer = new Customer({
      name: name.trim(),
      phone: phone.trim(),
      totalVisits: 0,
      lastVisit: new Date(),
    });

    await customer.save();

    return NextResponse.json({
      id: customer._id,
      name: customer.name,
      phone: customer.phone,
      totalVisits: customer.totalVisits,
    }, { status: 201 });
  } catch (error) {
    console.error('Register customer error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}