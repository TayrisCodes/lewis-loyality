import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/SystemUser';
import Store from '../models/Store';
import Customer from '../models/Customer';
import Visit from '../models/Visit';
import Reward from '../models/Reward';
import RewardRule from '../models/RewardRule';
import { generateQRToken, generateQRImage, generateQRUrl } from '../lib/qr-generator';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:password123@localhost:27020/lewis-loyalty?authSource=admin';

// Validate required environment variables
if (!process.env.APP_SECRET) {
  console.error('❌ Error: APP_SECRET environment variable is not set!');
  console.error('Please create .env.local file with APP_SECRET defined.');
  console.error('Example: APP_SECRET=your-app-secret-for-qr-tokens');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('❌ Error: JWT_SECRET environment variable is not set!');
  console.error('Please create .env.local file with JWT_SECRET defined.');
  console.error('Example: JWT_SECRET=your-jwt-secret');
  process.exit(1);
}

async function seedComplete() {
  try {
    console.log('🌱 Starting comprehensive database seeding...\n');

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Store.deleteMany({});
    await Customer.deleteMany({});
    await Visit.deleteMany({});
    await Reward.deleteMany({});
    await RewardRule.deleteMany({});
    console.log('✅ Data cleared\n');

    // 1. Create Super Admin
    console.log('👤 Creating Super Admin...');
    const hashedPassword = await bcrypt.hash('admin123', 12);

    const superAdmin = await User.create({
      name: 'Super Administrator',
      email: 'admin@lewisloyalty.com',
      passwordHash: hashedPassword,
      role: 'superadmin',
      isActive: true,
    });
    console.log('✅ Created Super Admin');
    console.log('   Email: admin@lewisloyalty.com');
    console.log('   Password: admin123\n');

    // 2. Create Stores with QR codes
    console.log('🏪 Creating stores with QR codes...');
    const storeData = [
      { name: 'Lewis Coffee - Downtown', address: '123 Main Street, Addis Ababa' },
      { name: 'Lewis Coffee - Bole', address: '456 Bole Road, Addis Ababa' },
      { name: 'Lewis Coffee - Piassa', address: '789 Churchill Avenue, Addis Ababa' },
    ];

    const stores = [];
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setHours(0, 0, 0, 0);

    for (const data of storeData) {
      // Create store first to get ID
      const store = new Store({
        name: data.name,
        address: data.address,
        isActive: true,
      });

      // Generate QR code
      const storeId = (store._id as mongoose.Types.ObjectId).toString();
      const token = generateQRToken(storeId, today);
      const qrUrl = generateQRUrl(storeId, token, today);

      // Generate QR image
      try {
        const qrImageUrl = await generateQRImage(token, storeId, today);
        console.log(`   Generated QR image: ${qrImageUrl}`);
      } catch (error) {
        console.log(`   ⚠️  QR image generation failed (image will be generated on first access)`);
      }

      store.qrToken = token;
      store.qrUrl = qrUrl;
      store.qrExpiresAt = tomorrow;

      await store.save();
      stores.push(store);

      console.log(`✅ Created: ${store.name}`);
      console.log(`   Token: ${token.substring(0, 20)}...`);
      console.log(`   URL: ${qrUrl}`);
    }
    console.log();

    // 3. Create Store Admins
    console.log('👥 Creating store admins...');
    const storeAdmins = [];
    
    for (let i = 0; i < stores.length; i++) {
      const admin = await User.create({
        name: `Store Manager - ${stores[i].name}`,
        email: `admin${i + 1}@lewisloyalty.com`,
        passwordHash: hashedPassword,
        role: 'admin',
        storeId: stores[i]._id,
        isActive: true,
      });
      
      // Update store with admin reference
      stores[i].adminId = admin._id as mongoose.Types.ObjectId;
      await stores[i].save();
      
      storeAdmins.push(admin);
      console.log(`✅ Created admin for ${stores[i].name}`);
      console.log(`   Email: admin${i + 1}@lewisloyalty.com`);
      console.log(`   Password: admin123`);
    }
    console.log();

    // 4. Create Reward Rules for each store
    console.log('🎁 Creating reward rules...');
    for (const store of stores) {
      await RewardRule.create({
        storeId: store._id,
        visitsNeeded: 5,
        rewardValue: 'Free Coffee',
        isActive: true,
      });
      console.log(`✅ Created reward rule for ${store.name}: 5 visits = Free Coffee`);
    }
    console.log();

    // 5. Create Sample Customers
    console.log('👤 Creating sample customers...');
    const customerData = [
      { name: 'Abebe Bekele', phone: '+251911234567' },
      { name: 'Tigist Alemayehu', phone: '+251922345678' },
      { name: 'Dawit Tesfaye', phone: '+251933456789' },
      { name: 'Hanna Kebede', phone: '+251944567890' },
      { name: 'Samuel Mulugeta', phone: '+251955678901' },
      { name: 'Mahlet Haile', phone: '+251966789012' },
      { name: 'Yonas Getachew', phone: '+251977890123' },
      { name: 'Ruth Tadesse', phone: '+251988901234' },
      { name: 'Daniel Alemu', phone: '+251999012345' },
      { name: 'Eden Mekonnen', phone: '+251910123456' },
    ];

    const customers = [];
    for (const data of customerData) {
      const customer = await Customer.create({
        name: data.name,
        phone: data.phone,
        totalVisits: 0,
        lastVisit: new Date(),
      });
      customers.push(customer);
    }
    console.log(`✅ Created ${customers.length} sample customers\n`);

    // 6. Create Sample Visits and Rewards
    console.log('📍 Creating sample visits and rewards...');
    let totalVisits = 0;
    let totalRewards = 0;

    for (const customer of customers) {
      // Random number of visits per customer (3-8)
      const numVisits = Math.floor(Math.random() * 6) + 3;
      
      for (let i = 0; i < numVisits; i++) {
        // Pick a random store
        const store = stores[Math.floor(Math.random() * stores.length)];
        
        // Create visit (random date within last 30 days)
        const visitDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        
        // Count visits for this customer at this store
        const customerStoreVisits = await Visit.countDocuments({
          customerId: customer._id,
          storeId: store._id,
        });
        
        const isReward = (customerStoreVisits + 1) % 5 === 0;
        
        await Visit.create({
          customerId: customer._id,
          storeId: store._id,
          timestamp: visitDate,
          rewardEarned: isReward,
        });
        
        totalVisits++;
        
        // Create reward if earned
        if (isReward) {
          const rewardCode = `LEWIS${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
          await Reward.create({
            customerId: customer._id,
            storeId: store._id,
            code: rewardCode,
            rewardType: 'Free Coffee',
            issuedAt: visitDate,
            expiresAt: new Date(visitDate.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days
            status: Math.random() > 0.3 ? 'unused' : 'used',
            usedAt: Math.random() > 0.3 ? undefined : new Date(visitDate.getTime() + Math.random() * 15 * 24 * 60 * 60 * 1000),
          });
          totalRewards++;
        }
      }
      
      // Update customer total visits
      const customerTotalVisits = await Visit.countDocuments({ customerId: customer._id });
      const lastVisit = await Visit.findOne({ customerId: customer._id }).sort({ timestamp: -1 });
      
      customer.totalVisits = customerTotalVisits;
      customer.lastVisit = lastVisit?.timestamp || new Date();
      await customer.save();
    }
    
    console.log(`✅ Created ${totalVisits} sample visits`);
    console.log(`✅ Issued ${totalRewards} rewards\n`);

    // Summary
    console.log('═══════════════════════════════════════');
    console.log('📊 SEEDING SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`Super Admins: 1`);
    console.log(`Stores:       ${stores.length}`);
    console.log(`Store Admins: ${storeAdmins.length}`);
    console.log(`Customers:    ${customers.length}`);
    console.log(`Visits:       ${totalVisits}`);
    console.log(`Rewards:      ${totalRewards}`);
    console.log('═══════════════════════════════════════\n');

    console.log('📝 LOGIN CREDENTIALS:');
    console.log('─────────────────────────────────────');
    console.log('Super Admin:');
    console.log('  Email:    admin@lewisloyalty.com');
    console.log('  Password: admin123\n');
    
    console.log('Store Admins:');
    for (let i = 0; i < storeAdmins.length; i++) {
      console.log(`  ${stores[i].name}`);
      console.log(`  Email:    admin${i + 1}@lewisloyalty.com`);
      console.log(`  Password: admin123\n`);
    }

    console.log('Sample Customer (for testing):');
    console.log(`  Name:  ${customers[0].name}`);
    console.log(`  Phone: ${customers[0].phone}\n`);

    console.log('🎉 Database seeding completed successfully!\n');
    console.log('Next steps:');
    console.log('1. Login as super admin at http://localhost:3000/login');
    console.log('2. View analytics and manage stores');
    console.log('3. Login as store admin to see store dashboard');
    console.log('4. Test customer flow by scanning a store QR code\n');

  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  seedComplete();
}

export default seedComplete;

