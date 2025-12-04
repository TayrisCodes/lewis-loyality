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
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('❌ Error: JWT_SECRET environment variable is not set!');
  process.exit(1);
}

// Comprehensive Ethiopian names
const firstNames = [
  'Abebe', 'Alemayehu', 'Bekele', 'Dawit', 'Daniel', 'Eden', 'Elias', 'Fikadu',
  'Getachew', 'Girma', 'Hanna', 'Haile', 'Helen', 'Isaias', 'Johanna', 'Kebede',
  'Lemma', 'Mahlet', 'Mekdes', 'Mekonnen', 'Meseret', 'Mulugeta', 'Natnael', 'Rahel',
  'Ruth', 'Samuel', 'Sara', 'Selam', 'Solomon', 'Tadesse', 'Tesfaye', 'Tigist',
  'Yared', 'Yohannes', 'Yonas', 'Zelalem', 'Zerihun', 'Bethlehem', 'Biruk', 'Binyam',
  'Chaltu', 'Dagim', 'Degene', 'Desta', 'Ephrem', 'Eyerusalem', 'Fasika', 'Feven',
  'Genet', 'Hiwot', 'Kaleb', 'Kidus', 'Liya', 'Marta', 'Melat', 'Meron', 'Mickias',
  'Muluken', 'Nebiat', 'Netsanet', 'Rediet', 'Selamawit', 'Semhar', 'Senait', 'Surafel',
  'Tewodros', 'Tsehay', 'Tsion', 'Worku', 'Yabsira', 'Yeshi', 'Yetimwork', 'Zenebe'
];

const lastNames = [
  'Alemu', 'Alemayehu', 'Bekele', 'Desta', 'Gebru', 'Getachew', 'Girma', 'Haile',
  'Kebede', 'Lemma', 'Mekonnen', 'Mengistu', 'Mulugeta', 'Tadesse', 'Tesfaye', 'Wolde',
  'Abera', 'Adane', 'Asefa', 'Asfaw', 'Assefa', 'Ayele', 'Balcha', 'Berhanu',
  'Birhanu', 'Debebe', 'Demeke', 'Desta', 'Fekadu', 'Gebre', 'Gebremariam', 'Gezahegn',
  'Hagos', 'Kassa', 'Kidane', 'Legesse', 'Mamo', 'Negash', 'Negussie', 'Sisay',
  'Taye', 'Tekle', 'Tessema', 'Tilahun', 'Worku', 'Yilma', 'Zenebe', 'Zerihun'
];

// Store data with varied locations in Addis Ababa and other cities
const storeLocations = [
  // Addis Ababa
  { name: 'Lewis Coffee - Bole', address: '123 Bole Road, Addis Ababa', city: 'Addis Ababa', lat: 9.0320, lng: 38.7469 },
  { name: 'Lewis Coffee - Piassa', address: '45 Churchill Avenue, Piassa, Addis Ababa', city: 'Addis Ababa', lat: 9.0392, lng: 38.7525 },
  { name: 'Lewis Coffee - Meskel Square', address: '78 Ras Desta Damtew St, Addis Ababa', city: 'Addis Ababa', lat: 9.0109, lng: 38.7635 },
  { name: 'Lewis Coffee - CMC', address: '234 Africa Avenue, CMC, Addis Ababa', city: 'Addis Ababa', lat: 9.0084, lng: 38.7917 },
  { name: 'Lewis Coffee - Kazanchis', address: '67 Menelik II Avenue, Kazanchis, Addis Ababa', city: 'Addis Ababa', lat: 9.0307, lng: 38.7577 },
  { name: 'Lewis Coffee - Sarbet', address: '89 Djibouti Street, Sarbet, Addis Ababa', city: 'Addis Ababa', lat: 9.0267, lng: 38.7515 },
  { name: 'Lewis Coffee - 22 Mazoria', address: '156 Menelik II Square, 22 Mazoria, Addis Ababa', city: 'Addis Ababa', lat: 9.0369, lng: 38.7468 },
  { name: 'Lewis Coffee - Aware', address: '201 Haile Gebreselassie Road, Aware, Addis Ababa', city: 'Addis Ababa', lat: 9.0228, lng: 38.7856 },
  { name: 'Lewis Coffee - Megenagna', address: '345 Bole Megenagna, Addis Ababa', city: 'Addis Ababa', lat: 8.9936, lng: 38.7823 },
  { name: 'Lewis Coffee - Mexico', address: '567 Mexico Square, Addis Ababa', city: 'Addis Ababa', lat: 9.0110, lng: 38.7452 },
  
  // Other major cities
  { name: 'Lewis Coffee - Bahir Dar', address: '12 Blue Nile Avenue, Bahir Dar', city: 'Bahir Dar', lat: 11.5742, lng: 37.3615 },
  { name: 'Lewis Coffee - Hawassa', address: '34 Lake Side Road, Hawassa', city: 'Hawassa', lat: 7.0621, lng: 38.4766 },
  { name: 'Lewis Coffee - Mekelle', address: '56 Martyrs Memorial, Mekelle', city: 'Mekelle', lat: 13.4967, lng: 39.4753 },
  { name: 'Lewis Coffee - Dire Dawa', address: '78 Kezira Street, Dire Dawa', city: 'Dire Dawa', lat: 9.5930, lng: 41.8661 },
  { name: 'Lewis Coffee - Adama', address: '90 Main Street, Adama', city: 'Adama', lat: 8.5400, lng: 39.2675 },
];

// Reward rule configurations (varied)
const rewardConfigs = [
  { visitsNeeded: 3, rewardValue: 'Free Small Coffee' },
  { visitsNeeded: 5, rewardValue: 'Free Medium Coffee' },
  { visitsNeeded: 5, rewardValue: '50% Off Next Purchase' },
  { visitsNeeded: 7, rewardValue: 'Free Large Coffee + Pastry' },
  { visitsNeeded: 10, rewardValue: 'Free Coffee for a Week' },
  { visitsNeeded: 4, rewardValue: 'Free Cappuccino' },
  { visitsNeeded: 6, rewardValue: 'Free Latte + Cake' },
  { visitsNeeded: 8, rewardValue: 'Lewis Gold Card (10% Always)' },
];

// Helper function to generate random date within range
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to generate random phone number
function generatePhoneNumber(index: number): string {
  const prefixes = ['091', '092', '093', '094', '095', '096', '097', '098', '099', '070'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = String(1000000 + index).padStart(7, '0');
  return `+251${prefix}${number}`;
}

// Helper function to generate full name
function generateFullName(): string {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  return `${firstName} ${lastName}`;
}

async function seedComprehensive() {
  try {
    console.log('🌱 Starting COMPREHENSIVE database seeding...\n');
    console.log('═══════════════════════════════════════════════════════════════');

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

    // 1. Create Super Admins
    console.log('👤 Creating Super Admins...');
    const hashedPassword = await bcrypt.hash('admin123', 12);

    const superAdmins = await User.create([
      {
        name: 'Super Administrator',
        email: 'admin@lewisloyalty.com',
        passwordHash: hashedPassword,
        role: 'superadmin',
        isActive: true,
      },
      {
        name: 'System Manager',
        email: 'manager@lewisloyalty.com',
        passwordHash: hashedPassword,
        role: 'superadmin',
        isActive: true,
      },
    ]);
    console.log(`✅ Created ${superAdmins.length} Super Admins`);

    // 2. Create Stores with QR codes
    console.log('\n🏪 Creating stores with QR codes...');
    const stores = [];
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setHours(0, 0, 0, 0);

    for (const [index, data] of storeLocations.entries()) {
      const store = new Store({
        name: data.name,
        address: data.address,
        lat: data.lat,
        lng: data.lng,
        isActive: index < 13, // Last 2 stores inactive for testing
        
        // Receipt verification settings (Phase 1)
        tin: '0003169685', // Lewis Retail Company TIN
        branchName: data.name.split(' - ')[1] || data.city, // Extract branch name (e.g., "Bole")
        minReceiptAmount: 500, // Minimum 500 ETB
        receiptValidityHours: 24, // Receipts valid for 24 hours
        allowReceiptUploads: true, // Enable receipt uploads
      });

      const storeId = (store._id as mongoose.Types.ObjectId).toString();
      const token = generateQRToken(storeId, today);
      const qrUrl = generateQRUrl(storeId, token, today);

      try {
        const qrImageUrl = await generateQRImage(token, storeId, today);
        console.log(`   ✓ Generated QR for: ${store.name}`);
      } catch (error) {
        console.log(`   ⚠️  QR image for ${store.name} will be generated on first access`);
      }

      store.qrToken = token;
      store.qrUrl = qrUrl;
      store.qrExpiresAt = tomorrow;

      await store.save();
      stores.push(store);
    }
    console.log(`✅ Created ${stores.length} stores (${stores.filter(s => s.isActive).length} active)`);

    // 3. Create Store Admins
    console.log('\n👥 Creating store admins...');
    const storeAdmins = [];
    
    for (let i = 0; i < stores.length; i++) {
      if (i < stores.length - 2) { // Don't create admins for inactive stores
        const admin = await User.create({
          name: `Manager - ${stores[i].name.split(' - ')[1] || stores[i].name}`,
          email: `admin${i + 1}@lewisloyalty.com`,
          passwordHash: hashedPassword,
          role: 'admin',
          storeId: stores[i]._id,
          isActive: true,
          lastLogin: randomDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()),
        });
        
        stores[i].adminId = admin._id as mongoose.Types.ObjectId;
        await stores[i].save();
        
        storeAdmins.push(admin);
      }
    }
    console.log(`✅ Created ${storeAdmins.length} store admins`);

    // 4. Create Reward Rules for each active store
    console.log('\n🎁 Creating reward rules...');
    const activeStores = stores.filter(s => s.isActive);
    for (const [index, store] of activeStores.entries()) {
      const config = rewardConfigs[index % rewardConfigs.length];
      await RewardRule.create({
        storeId: store._id,
        visitsNeeded: config.visitsNeeded,
        rewardValue: config.rewardValue,
        isActive: true,
      });
      console.log(`   ✓ ${store.name}: ${config.visitsNeeded} visits = ${config.rewardValue}`);
    }
    console.log(`✅ Created reward rules for ${activeStores.length} stores`);

    // 5. Create Comprehensive Customer Base
    console.log('\n👥 Creating comprehensive customer base...');
    const numCustomers = 100;
    const customers = [];
    
    for (let i = 0; i < numCustomers; i++) {
      const customer = await Customer.create({
        name: generateFullName(),
        phone: generatePhoneNumber(i),
        totalVisits: 0,
        lastVisit: new Date(),
      });
      customers.push(customer);
      
      if ((i + 1) % 20 === 0) {
        console.log(`   ✓ Created ${i + 1}/${numCustomers} customers`);
      }
    }
    console.log(`✅ Created ${customers.length} customers`);

    // 6. Create Realistic Visits and Rewards
    console.log('\n📍 Generating realistic visit history (this may take a moment)...');
    let totalVisits = 0;
    let totalRewards = 0;
    
    // Date range: last 90 days to today
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const now = new Date();

    // Customer visit patterns
    const customerTypes = {
      veryFrequent: Math.floor(customers.length * 0.1), // 10% visit 3-5 times per week
      frequent: Math.floor(customers.length * 0.25), // 25% visit 1-2 times per week
      regular: Math.floor(customers.length * 0.40), // 40% visit 2-4 times per month
      occasional: Math.floor(customers.length * 0.25), // 25% visit 1-3 times total
    };

    for (const [index, customer] of customers.entries()) {
      let numVisits: number;
      let visitFrequency: number; // days between visits
      
      // Determine customer type and visit pattern
      if (index < customerTypes.veryFrequent) {
        numVisits = Math.floor(Math.random() * 30) + 30; // 30-60 visits
        visitFrequency = 2; // every 2-3 days
      } else if (index < customerTypes.veryFrequent + customerTypes.frequent) {
        numVisits = Math.floor(Math.random() * 15) + 12; // 12-27 visits
        visitFrequency = 5; // every 5-7 days
      } else if (index < customerTypes.veryFrequent + customerTypes.frequent + customerTypes.regular) {
        numVisits = Math.floor(Math.random() * 8) + 5; // 5-12 visits
        visitFrequency = 10; // every 10-15 days
      } else {
        numVisits = Math.floor(Math.random() * 3) + 1; // 1-3 visits
        visitFrequency = 30; // random sparse visits
      }

      // Assign favorite stores (customers tend to visit same stores)
      const favoriteStores: any[] = [];
      const numFavoriteStores = Math.random() > 0.7 ? 2 : 1; // 70% loyal to 1 store, 30% visit 2 stores
      
      for (let i = 0; i < numFavoriteStores; i++) {
        const store = activeStores[Math.floor(Math.random() * activeStores.length)];
        if (!favoriteStores.includes(store)) {
          favoriteStores.push(store);
        }
      }

      // Create visits
      let currentDate = randomDate(ninetyDaysAgo, new Date(ninetyDaysAgo.getTime() + 7 * 24 * 60 * 60 * 1000));
      const visits: any[] = [];

      for (let i = 0; i < numVisits; i++) {
        // Pick store (80% favorite, 20% random)
        const store = Math.random() > 0.2 
          ? favoriteStores[Math.floor(Math.random() * favoriteStores.length)]
          : activeStores[Math.floor(Math.random() * activeStores.length)];

        // Calculate next visit date
        const daysUntilNext = visitFrequency + Math.floor(Math.random() * visitFrequency);
        currentDate = new Date(currentDate.getTime() + daysUntilNext * 24 * 60 * 60 * 1000);
        
        // Stop if we've exceeded current date
        if (currentDate > now) break;

        // Count visits for this customer at this specific store
        const storeVisitCount = visits.filter(v => v.storeId.equals(store._id)).length + 1;

        // Get reward rule for this store
        const rewardRule = await RewardRule.findOne({ storeId: store._id, isActive: true });
        const isReward = rewardRule ? storeVisitCount % rewardRule.visitsNeeded === 0 : false;

        // Create visit
        const visit = await Visit.create({
          customerId: customer._id,
          storeId: store._id,
          timestamp: currentDate,
          rewardEarned: isReward,
        });
        
        visits.push(visit);
        totalVisits++;

        // Create reward if earned
        if (isReward && rewardRule) {
          const rewardCode = `LEWIS${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
          const rewardIssuedAt = currentDate;
          const rewardExpiresAt = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000);
          
          // Determine if reward is used (70% of old rewards are used, 20% of recent rewards)
          const daysSinceIssued = (now.getTime() - rewardIssuedAt.getTime()) / (24 * 60 * 60 * 1000);
          const isUsed = daysSinceIssued > 7 ? Math.random() > 0.3 : Math.random() > 0.8;
          const usedDate = isUsed 
            ? new Date(rewardIssuedAt.getTime() + Math.random() * Math.min(daysSinceIssued, 25) * 24 * 60 * 60 * 1000)
            : undefined;

          await Reward.create({
            customerId: customer._id,
            storeId: store._id,
            code: rewardCode,
            rewardType: rewardRule.rewardValue,
            issuedAt: rewardIssuedAt,
            expiresAt: rewardExpiresAt,
            status: isUsed ? 'used' : 'unused',
            usedAt: usedDate,
          });
          totalRewards++;
        }
      }

      // Update customer total visits and last visit
      if (visits.length > 0) {
        customer.totalVisits = visits.length;
        customer.lastVisit = visits[visits.length - 1].timestamp;
        await customer.save();
      }

      if ((index + 1) % 10 === 0) {
        console.log(`   ✓ Processed ${index + 1}/${customers.length} customers (${totalVisits} visits, ${totalRewards} rewards)`);
      }
    }
    
    console.log(`✅ Created ${totalVisits} visits and ${totalRewards} rewards`);

    // 7. Generate Statistics
    console.log('\n📊 Calculating statistics...');
    
    const stats = {
      totalCustomers: await Customer.countDocuments(),
      activeCustomers: await Customer.countDocuments({ 
        lastVisit: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } 
      }),
      totalVisits: await Visit.countDocuments(),
      visitsLast7Days: await Visit.countDocuments({
        timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }),
      visitsLast30Days: await Visit.countDocuments({
        timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }),
      totalRewards: await Reward.countDocuments(),
      unusedRewards: await Reward.countDocuments({ status: 'unused' }),
      usedRewards: await Reward.countDocuments({ status: 'used' }),
      expiredRewards: await Reward.countDocuments({ 
        expiresAt: { $lt: new Date() },
        status: 'unused'
      }),
    };

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 COMPREHENSIVE SEEDING SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Super Admins:          ${superAdmins.length}`);
    console.log(`Stores:                ${stores.length} (${stores.filter(s => s.isActive).length} active)`);
    console.log(`Store Admins:          ${storeAdmins.length}`);
    console.log(`Reward Rules:          ${activeStores.length}`);
    console.log(`Customers:             ${stats.totalCustomers}`);
    console.log(`  - Active (30 days):  ${stats.activeCustomers}`);
    console.log(`Visits:                ${stats.totalVisits}`);
    console.log(`  - Last 7 days:       ${stats.visitsLast7Days}`);
    console.log(`  - Last 30 days:      ${stats.visitsLast30Days}`);
    console.log(`Rewards:               ${stats.totalRewards}`);
    console.log(`  - Unused:            ${stats.unusedRewards}`);
    console.log(`  - Used:              ${stats.usedRewards}`);
    console.log(`  - Expired:           ${stats.expiredRewards}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('📝 LOGIN CREDENTIALS:');
    console.log('─────────────────────────────────────────────────────────────────');
    console.log('Super Admins:');
    console.log('  1. Email:    admin@lewisloyalty.com');
    console.log('     Password: admin123');
    console.log('  2. Email:    manager@lewisloyalty.com');
    console.log('     Password: admin123\n');
    
    console.log('Store Admins (all use password: admin123):');
    for (let i = 0; i < Math.min(5, storeAdmins.length); i++) {
      const store = stores[i];
      console.log(`  ${i + 1}. ${store.name}`);
      console.log(`     Email: admin${i + 1}@lewisloyalty.com`);
    }
    if (storeAdmins.length > 5) {
      console.log(`  ... and ${storeAdmins.length - 5} more`);
    }
    
    console.log('\nSample Customers (for testing):');
    for (let i = 0; i < Math.min(3, customers.length); i++) {
      console.log(`  ${i + 1}. Name:  ${customers[i].name}`);
      console.log(`     Phone: ${customers[i].phone}`);
      console.log(`     Visits: ${customers[i].totalVisits}`);
    }

    console.log('\n🎉 Comprehensive database seeding completed successfully!\n');
    console.log('Next steps:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Login as super admin at http://localhost:3000/login');
    console.log('3. View rich analytics with real data');
    console.log('4. Test store admin dashboards');
    console.log('5. Test customer flow by scanning store QR codes\n');

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
  seedComprehensive();
}

export default seedComprehensive;






