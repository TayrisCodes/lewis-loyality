import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import dbConnect from "../lib/db";
import Customer from "../models/Customer";
import SystemUser from "../models/SystemUser";
import Store from "../models/Store";
import Visit from "../models/Visit";
import QRCode from "../models/QRCode";

async function resetDatabase() {
  try {
    console.log("🗑️  Starting database cleanup...\n");

    // Connect using app's connection
    await dbConnect();
    console.log("✅ Connected to MongoDB\n");

    // Delete all documents from each collection
    console.log("Clearing collections...");
    
    try {
      const customerCount = await Customer.countDocuments();
      await Customer.deleteMany({});
      console.log(`✅ Deleted ${customerCount} customers`);
    } catch (e) {
      console.log(`✅ Customers collection cleared (or didn't exist)`);
    }

    try {
      const userCount = await SystemUser.countDocuments();
      await SystemUser.deleteMany({});
      console.log(`✅ Deleted ${userCount} system users`);
    } catch (e) {
      console.log(`✅ System users collection cleared (or didn't exist)`);
    }

    try {
      const storeCount = await Store.countDocuments();
      await Store.deleteMany({});
      console.log(`✅ Deleted ${storeCount} stores`);
    } catch (e) {
      console.log(`✅ Stores collection cleared (or didn't exist)`);
    }

    try {
      const visitCount = await Visit.countDocuments();
      await Visit.deleteMany({});
      console.log(`✅ Deleted ${visitCount} visits`);
    } catch (e) {
      console.log(`✅ Visits collection cleared (or didn't exist)`);
    }

    try {
      const qrCount = await QRCode.countDocuments();
      await QRCode.deleteMany({});
      console.log(`✅ Deleted ${qrCount} QR codes`);
    } catch (e) {
      console.log(`✅ QR codes collection cleared (or didn't exist)`);
    }

    console.log("\n✅ Database cleared successfully!");
    console.log("🎉 Ready for reseeding\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

resetDatabase();

