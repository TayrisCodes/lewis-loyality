/**
 * Update store with TIN 0003169685 to be active and allow receipt uploads
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.production' });
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import dbConnect from '../lib/db';
import Store from '../models/Store';

async function updateStore() {
  try {
    await dbConnect();
    console.log('✅ Connected to MongoDB\n');

    // Find store by TIN
    const tin = '0003169685';
    let store = await Store.findOne({ tin });

    if (!store) {
      console.log(`📝 Creating new store with TIN: ${tin}`);
      store = await Store.create({
        name: 'Lewis Coffee - Downtown',
        address: 'Addis Ababa, Kirkos S/C, Woreda 01, H.No 420, Bambis Bldg',
        tin: tin,
        branchName: 'Downtown',
        isActive: true,
        allowQrScanning: true,
        allowReceiptUploads: true,
        minReceiptAmount: 2000, // Minimum receipt amount (in ETB)
        receiptValidityHours: 24, // 24 hours validity
      });
      console.log(`✅ Store created: ${store._id}\n`);
    } else {
      console.log(`📝 Updating existing store: ${store.name} (${store._id})`);
      store.name = 'Lewis Coffee - Downtown';
      store.isActive = true;
      store.allowQrScanning = true;
      store.allowReceiptUploads = true;
      store.minReceiptAmount = 2000; // Set to 2000 ETB minimum
      store.receiptValidityHours = 24; // 24 hours validity
      await store.save();
      console.log(`✅ Store updated\n`);
    }

    console.log('📋 Store Details:');
    console.log(`   Name: ${store.name}`);
    console.log(`   TIN: ${store.tin}`);
    console.log(`   Branch: ${store.branchName || 'N/A'}`);
    console.log(`   Active: ${store.isActive}`);
    console.log(`   Allow QR Scanning: ${store.allowQrScanning}`);
    console.log(`   Allow Receipt Uploads: ${store.allowReceiptUploads}`);
    console.log(`   Min Receipt Amount: ${store.minReceiptAmount} ETB`);
    console.log(`   Receipt Validity: ${store.receiptValidityHours} hours`);
    console.log(`   Store ID: ${store._id}\n`);

    console.log('✅ Store is now configured for receipt uploads!\n');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

updateStore();

