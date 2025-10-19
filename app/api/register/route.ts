import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/models/Customer";
import { sendWelcomeMessage } from "@/lib/whatsapp";
import { validateEthiopianPhone } from "@/lib/utils";

/**
 * POST /api/register - Register new customer
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { name, phone } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name and phone number are required" },
        { status: 400 }
      );
    }

    // Validate phone format
    if (!validateEthiopianPhone(phone)) {
      return NextResponse.json(
        { error: "Invalid Ethiopian phone number format" },
        { status: 400 }
      );
    }

    // Check if customer already exists
    const existingCustomer = await Customer.findOne({ phone });

    if (existingCustomer) {
      return NextResponse.json(
        { error: "Customer already registered" },
        { status: 409 }
      );
    }

    // Create new customer
    const customer = new Customer({
      name: name.trim(),
      phone: phone.trim(),
      totalVisits: 0,
      storeVisits: [],
      rewards: [],
    });

    await customer.save();

    // Send welcome WhatsApp message (non-blocking)
    sendWelcomeMessage(customer.name, customer.phone).catch(console.error);

    return NextResponse.json({
      success: true,
      user: {
        name: customer.name,
        phone: customer.phone,
        createdAt: customer.createdAt,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}




