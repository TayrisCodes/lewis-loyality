import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Store from "@/models/Store";
import { extractTokenFromHeader, verifyToken } from "@/lib/auth";
import { generateDailyCode } from "@/lib/utils";

/**
 * GET /api/store - Get all active stores
 */
export async function GET() {
  try {
    await dbConnect();

    const stores = await Store.find({ isActive: true }).select(
      "name lat lng dailyCode address qrCodeUrl"
    );

    return NextResponse.json({ stores });
  } catch (error) {
    console.error("Get stores error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/store - Create new store (Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    // Verify admin token
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (payload.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, lat, lng, dailyCode, address, adminId } = body;

    if (!name || !lat || !lng) {
      return NextResponse.json(
        { error: "Name, latitude, and longitude are required" },
        { status: 400 }
      );
    }

    const store = new Store({
      name: name.trim(),
      lat,
      lng,
      dailyCode: dailyCode || generateDailyCode(),
      address: address?.trim(),
      adminId,
      isActive: true,
    });

    await store.save();

    return NextResponse.json({
      success: true,
      store: {
        id: store._id,
        name: store.name,
        lat: store.lat,
        lng: store.lng,
        dailyCode: store.dailyCode,
        address: store.address,
      },
    });
  } catch (error) {
    console.error("Create store error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/store - Update store (Admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    await dbConnect();

    // Verify admin token
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);

    if (!payload) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (payload.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { storeId, ...updates } = body;

    if (!storeId) {
      return NextResponse.json(
        { error: "Store ID is required" },
        { status: 400 }
      );
    }

    const store = await Store.findByIdAndUpdate(storeId, updates, {
      new: true,
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, store });
  } catch (error) {
    console.error("Update store error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}




