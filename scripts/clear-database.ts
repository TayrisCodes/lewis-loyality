import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://admin:password123@localhost:27020/lewis-loyalty?authSource=admin";

async function clearDatabase() {
  try {
    console.log("🗑️  Starting database cleanup...\n");

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
    console.log(`📍 Database: ${mongoose.connection.name}\n`);

    // Get all collections
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not established");
    }
    const collections = await db.collections();
    
    console.log(`📊 Found ${collections.length} collections:\n`);

    // Drop each collection
    for (const collection of collections) {
      const count = await collection.countDocuments();
      console.log(`   Dropping: ${collection.collectionName} (${count} documents)`);
      await collection.drop();
    }

    console.log("\n✅ All collections dropped successfully!");
    console.log("🎉 Database is now clean and ready for seeding\n");

    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
  } catch (error) {
    console.error("❌ Error clearing database:", error);
    process.exit(1);
  }
}

clearDatabase();

