import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Store from "@/models/Store";
import QRCode from "@/models/QRCode";
import { generateQRCode } from "@/lib/qrcode";
import { extractTokenFromHeader, verifyToken } from "@/lib/auth";

/**
 * POST /api/qr/generate - Generate QR code for a store
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Verify admin token
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const payload = verifyToken(token);
      if (!payload || (payload.role !== "superadmin" && payload.role !== "admin")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const body = await request.json();
    const { storeId } = body;

    if (!storeId) {
      return NextResponse.json(
        { error: "Store ID is required" },
        { status: 400 }
      );
    }

    const store = await Store.findById(storeId);

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Generate QR code
    const { qrDataURL, token: qrToken } = await generateQRCode(
      storeId,
      store.name
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    // Update or create QR code record
    const qrCode = await QRCode.findOneAndUpdate(
      { storeId },
      {
        storeId,
        qrData: qrDataURL,
        qrImageUrl: `/qr/${storeId}.png`,
        token: qrToken,
        expiresAt,
        generatedAt: new Date(),
        scanCount: 0,
      },
      { upsert: true, new: true }
    );

    // Update store with QR info
    store.qrToken = qrToken;
    store.qrUrl = qrCode.qrImageUrl;
    store.qrExpiresAt = expiresAt;
    await store.save();

    return NextResponse.json({
      success: true,
      qrCode: {
        qrData: qrDataURL,
        qrUrl: qrCode.qrImageUrl,
        token: qrToken,
        expiresAt,
      },
    });
  } catch (error) {
    console.error("Generate QR error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}




