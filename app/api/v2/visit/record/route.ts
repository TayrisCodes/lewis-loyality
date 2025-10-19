import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/models/Customer";
import Visit from "@/models/Visit";
import Store from "@/models/Store";
import { isWithinStoreRadius } from "@/lib/utils";
import { sendVisitMessage, sendRewardMessage } from "@/lib/whatsapp";
import mongoose from "mongoose";

/**
 * POST /api/v2/visit/record - Record customer visit with reward logic
 */
export async function POST(request: NextRequest) {
  try {
    await dbConnect();

    const body = await request.json();
    const { phone, storeId, location, dailyCode } = body;

    if (!phone || !storeId) {
      return NextResponse.json(
        { error: "Phone number and store ID are required" },
        { status: 400 }
      );
    }

    // Find customer
    const customer = await Customer.findOne({ phone });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found. Please register first." },
        { status: 404 }
      );
    }

    // Find store
    const store = await Store.findById(storeId);

    if (!store || !store.isActive) {
      return NextResponse.json(
        { error: "Store not found or inactive" },
        { status: 404 }
      );
    }

    // Validate location OR daily code
    let isValid = false;

    if (location && location.lat && location.lng && store.lat && store.lng) {
      isValid = isWithinStoreRadius(location.lat, location.lng, store.lat, store.lng, 100);
    } else if (dailyCode && store.dailyCode) {
      isValid = dailyCode.toUpperCase() === store.dailyCode.toUpperCase();
    }

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid location or code. Please scan from inside the store." },
        { status: 400 }
      );
    }

    // Check rate limit (10 minutes between visits)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentVisit = await Visit.findOne({
      phone,
      timestamp: { $gte: tenMinutesAgo },
    });

    if (recentVisit) {
      return NextResponse.json(
        { error: "Please wait at least 10 minutes between visits." },
        { status: 429 }
      );
    }

    // Find or create store visit record
    const storeObjectId = new mongoose.Types.ObjectId(storeId);
    if (!customer.storeVisits) {
      customer.storeVisits = [];
    }
    let storeVisit = customer.storeVisits.find(
      (sv) => sv.storeId.toString() === storeId
    );

    if (!storeVisit) {
      customer.storeVisits.push({
        storeId: storeObjectId,
        visitCount: 0,
        lastVisit: new Date(),
      });
      storeVisit = customer.storeVisits[customer.storeVisits.length - 1];
    }

    // Increment visit counts
    storeVisit.visitCount += 1;
    storeVisit.lastVisit = new Date();
    customer.totalVisits += 1;

    // Check if reward earned (every 5th visit to THIS store)
    const isReward = storeVisit.visitCount % 5 === 0;

    if (isReward) {
      if (!customer.rewards) {
        customer.rewards = [];
      }
      customer.rewards.push({
        storeId: storeObjectId,
        rewardType: "Lewis Gift Card",
        dateIssued: new Date(),
        status: "unused",
      });
    }

    await customer.save();

    // Create visit record
    const visit = new Visit({
      phone,
      storeId,
      location,
      timestamp: new Date(),
      isReward,
    });

    await visit.save();

    // Send WhatsApp notifications (non-blocking)
    if (isReward) {
      sendRewardMessage(customer.name, customer.phone, store.name).catch(
        console.error
      );
    } else {
      sendVisitMessage(customer.name, customer.phone, storeVisit.visitCount).catch(
        console.error
      );
    }

    // Count unused rewards
    const unusedRewards = customer.rewards ? customer.rewards.filter((r) => r.status === "unused").length : 0;

    return NextResponse.json({
      success: true,
      visit: {
        totalVisits: customer.totalVisits,
        storeVisitCount: storeVisit.visitCount,
        isReward,
        storeName: store.name,
        timestamp: visit.timestamp,
        unusedRewards,
      },
    });
  } catch (error) {
    console.error("Visit recording error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}




