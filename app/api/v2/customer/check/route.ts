import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/models/Customer";

/**
 * POST /api/v2/customer/check - Get customer details with populated store data
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    const customer = await Customer.findOne({ phone });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Manually populate store details if needed
    // For now, return customer data as is
    return NextResponse.json({
      customer: {
        name: customer.name,
        phone: customer.phone,
        totalVisits: customer.totalVisits,
        lastVisit: customer.lastVisit,
        rewards: customer.rewards || [],
        storeVisits: customer.storeVisits || [],
        createdAt: customer.createdAt,
      },
    });
  } catch (error) {
    console.error("Customer check error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}




