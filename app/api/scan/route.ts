import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Store from "@/models/Store";
import QRCode from "@/models/QRCode";
import { parseQRData, validateQRCode } from "@/lib/qrcode";

/**
 * POST /api/scan - Validate QR code scan
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { qrData } = body;

    if (!qrData) {
      return NextResponse.json(
        { error: "QR data is required" },
        { status: 400 }
      );
    }

    // Parse QR data
    const parsedData = parseQRData(qrData);

    if (!parsedData) {
      return NextResponse.json(
        { error: "Invalid QR code format" },
        { status: 400 }
      );
    }

    // Validate QR code age
    if (!validateQRCode(parsedData)) {
      return NextResponse.json(
        { error: "QR code has expired" },
        { status: 400 }
      );
    }

    // Find store
    const store = await Store.findById(parsedData.storeId);

    if (!store || !store.isActive) {
      return NextResponse.json(
        { error: "Store not found or inactive" },
        { status: 404 }
      );
    }

    // Update scan count
    await QRCode.findOneAndUpdate(
      { storeId: parsedData.storeId },
      {
        $inc: { scanCount: 1 },
        lastScanned: new Date(),
      }
    );

    return NextResponse.json({
      success: true,
      store: {
        id: store._id,
        name: store.name,
        address: store.address,
      },
      message: "Valid QR code",
    });
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}




