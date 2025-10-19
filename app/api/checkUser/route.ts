import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/models/Customer";

/**
 * POST /api/checkUser - Check if customer exists
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
      return NextResponse.json({ exists: false });
    }

    return NextResponse.json({
      exists: true,
      user: {
        name: customer.name,
        phone: customer.phone,
        totalVisits: customer.totalVisits,
      },
      visitCount: customer.totalVisits,
    });
  } catch (error) {
    console.error("Check user error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}




