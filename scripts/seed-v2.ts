import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// Import models
import Customer from "../models/Customer";
import SystemUser from "../models/SystemUser";
import Store from "../models/Store";
import Visit from "../models/Visit";
import QRCode from "../models/QRCode";
import { hashPassword } from "../lib/auth";
import { generateDailyCode } from "../lib/utils";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://admin:password123@localhost:27020/lewis-loyalty?authSource=admin";

async function seed() {
  try {
    console.log("🌱 Starting database seeding...\n");

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Clear existing data
    console.log("🗑️  Clearing existing data...");
    await Customer.deleteMany({});
    await SystemUser.deleteMany({});
    await Store.deleteMany({});
    await Visit.deleteMany({});
    await QRCode.deleteMany({});
    console.log("✅ Data cleared\n");

    // Create Stores
    console.log("🏪 Creating stores...");
    const stores = await Store.insertMany([
      {
        name: "Lewis Addis Ababa Branch",
        lat: 9.0320,
        lng: 38.7469,
        dailyCode: generateDailyCode(),
        address: "Bole, Addis Ababa, Ethiopia",
        isActive: true,
      },
      {
        name: "Lewis Hawassa Branch",
        lat: 7.0623,
        lng: 38.4760,
        dailyCode: generateDailyCode(),
        address: "Hawassa, Ethiopia",
        isActive: true,
      },
      {
        name: "Lewis Adama Branch",
        lat: 8.5400,
        lng: 39.2700,
        dailyCode: generateDailyCode(),
        address: "Adama (Nazret), Ethiopia",
        isActive: true,
      },
    ]);
    console.log(`✅ Created ${stores.length} stores`);
    stores.forEach((store) => {
      console.log(`   - ${store.name} (Code: ${store.dailyCode})`);
    });
    console.log();

    // Create System Users (Admins)
    console.log("👤 Creating system users...");
    const hashedPassword = await hashPassword("admin123");

    const superadmin = await SystemUser.create({
      name: "Super Administrator",
      phone: "0911111111",
      email: "superadmin@lewisloyalty.com",
      password: hashedPassword,
      role: "superadmin",
      isActive: true,
    });
    console.log("✅ Created SuperAdmin");
    console.log(`   Email: superadmin@lewisloyalty.com`);
    console.log(`   Password: admin123\n`);

    const storeAdmins = [];
    for (let i = 0; i < stores.length; i++) {
      const admin = await SystemUser.create({
        name: `Store Manager ${i + 1}`,
        phone: `09${1000000 + i}`,
        email: `admin${i + 1}@lewisloyalty.com`,
        password: hashedPassword,
        role: "admin",
        storeId: stores[i]._id,
        isActive: true,
      });
      storeAdmins.push(admin);
      console.log(`✅ Created Store Admin for ${stores[i].name}`);
      console.log(`   Email: admin${i + 1}@lewisloyalty.com`);
      console.log(`   Password: admin123`);
    }
    console.log();

    // Update stores with admin IDs
    for (let i = 0; i < stores.length; i++) {
      stores[i].adminId = storeAdmins[i]._id as any;
      await stores[i].save();
    }

    // Create Customers
    console.log("👥 Creating customers...");
    const customerNames = [
      { name: "Abebe Kebede", phone: "0911234567" },
      { name: "Tigist Alemu", phone: "0922345678" },
      { name: "Dawit Alemayehu", phone: "0933456789" },
      { name: "Hanna Bekele", phone: "0944567890" },
      { name: "Samuel Tesfaye", phone: "0955678901" },
      { name: "Mahlet Tadesse", phone: "0966789012" },
      { name: "Yonas Mekonnen", phone: "0977890123" },
      { name: "Ruth Getachew", phone: "0988901234" },
      { name: "Daniel Haile", phone: "0999012345" },
      { name: "Eden Mulugeta", phone: "0910123456" },
    ];

    const customers = [];
    for (const customerData of customerNames) {
      const customer = await Customer.create({
        name: customerData.name,
        phone: customerData.phone,
        totalVisits: 0,
        storeVisits: [],
        rewards: [],
      });
      customers.push(customer);
    }
    console.log(`✅ Created ${customers.length} customers\n`);

    // Create Visits and Rewards
    console.log("📍 Creating visits and rewards...");
    let totalVisits = 0;
    let totalRewards = 0;

    for (const customer of customers) {
      // Random number of visits per customer (between 3 and 12)
      const numVisits = Math.floor(Math.random() * 10) + 3;

      for (let i = 0; i < numVisits; i++) {
        // Pick a random store
        const store = stores[Math.floor(Math.random() * stores.length)];

        // Find or create store visit record
        if (!customer.storeVisits) {
          customer.storeVisits = [];
        }
        let storeVisit = customer.storeVisits.find(
          (sv) => sv.storeId.toString() === (store._id as any).toString()
        );

        if (!storeVisit) {
          customer.storeVisits.push({
            storeId: store._id as any,
            visitCount: 0,
            lastVisit: new Date(),
          });
          storeVisit = customer.storeVisits[customer.storeVisits.length - 1];
        }

        storeVisit.visitCount += 1;
        storeVisit.lastVisit = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Random date within last 30 days
        customer.totalVisits += 1;

        // Check if reward earned
        const isReward = storeVisit.visitCount % 5 === 0;

        if (isReward) {
          if (!customer.rewards) {
            customer.rewards = [];
          }
          customer.rewards.push({
            storeId: store._id as any,
            rewardType: "Lewis Gift Card",
            dateIssued: storeVisit.lastVisit,
            status: Math.random() > 0.3 ? "unused" : "used",
          });
          totalRewards++;
        }

        // Create visit record
        await Visit.create({
          phone: customer.phone,
          storeId: store._id,
          location: {
            lat: store.lat + (Math.random() - 0.5) * 0.001,
            lng: store.lng + (Math.random() - 0.5) * 0.001,
          },
          timestamp: storeVisit.lastVisit,
          isReward,
        });

        totalVisits++;
      }

      await customer.save();
    }

    console.log(`✅ Created ${totalVisits} visits`);
    console.log(`✅ Issued ${totalRewards} rewards\n`);

    // Summary
    console.log("📊 SEEDING SUMMARY");
    console.log("==================");
    console.log(`Stores:     ${stores.length}`);
    console.log(`Admins:     ${storeAdmins.length + 1} (1 SuperAdmin + ${storeAdmins.length} Store Admins)`);
    console.log(`Customers:  ${customers.length}`);
    console.log(`Visits:     ${totalVisits}`);
    console.log(`Rewards:    ${totalRewards}`);
    console.log("\n🎉 Database seeding completed successfully!\n");

    console.log("📝 Login Credentials:");
    console.log("SuperAdmin: superadmin@lewisloyalty.com / admin123");
    console.log("Store Admin: admin1@lewisloyalty.com / admin123");
    console.log("             admin2@lewisloyalty.com / admin123");
    console.log("             admin3@lewisloyalty.com / admin123\n");

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Seeding error:", error);
    process.exit(1);
  }
}

seed();


