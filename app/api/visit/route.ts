import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Visit from "@/models/Visit";

/**
 * GET /api/visit?phone={phone} - Get visit history
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    const visits = await Visit.find({ phone })
      .populate("storeId", "name address")
      .sort({ timestamp: -1 })
      .limit(50);

    return NextResponse.json({ visits });
  } catch (error) {
    console.error("Get visits error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}




