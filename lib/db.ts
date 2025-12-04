import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable. " +
    "For production, use MongoDB Atlas connection string: " +
    "mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority"
  );
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache;
}

let cached: MongooseCache = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    // MongoDB Atlas optimized connection options
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false,
      // Atlas-specific optimizations
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      // Connection retry settings (already in connection string, but explicit here)
      retryWrites: true,
      // Compression (Atlas supports compression)
      compressors: ['zlib'],
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log("✅ MongoDB Atlas connected successfully");
      console.log(`   Database: ${mongoose.connection.name}`);
      console.log(`   Host: ${mongoose.connection.host}`);
      return mongoose;
    }).catch((error) => {
      console.error("❌ MongoDB Atlas connection error:", error.message);
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;




