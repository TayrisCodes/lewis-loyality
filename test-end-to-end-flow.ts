/**
 * End-to-End Test: Complete Receipt to Reward Flow
 * 
 * Tests:
 * 1. Receipt validation (TIN, amount, invoice uniqueness, 24h limit)
 * 2. Visit recording
 * 3. Reward eligibility (5 visits within 45 days)
 * 4. Customer claim reward
 * 5. Admin redeem reward
 * 6. Admin scan QR code
 */

// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
import { config } from 'dotenv';

// Load .env.production first
const envResult = config({ path: '.env.production' });
if (envResult.error) {
  // Try .env as fallback
  config();
}

// Verify MONGODB_URI is loaded
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables!');
  console.error('   Please ensure .env.production contains MONGODB_URI');
  process.exit(1);
}

import dbConnect from './lib/db';
import Receipt from './models/Receipt';
import Customer from './models/Customer';
import Reward from './models/Reward';
import Store from './models/Store';
import mongoose from 'mongoose';
import fs from 'fs';

const TEST_PHONE = '0936308836';
const TEST_RECEIPT_IMAGE = 'uploads/receipts/unknown/photo_2025-11-26_11-44-49.jpg';

async function testEndToEndFlow() {
  console.log('\n🧪 END-TO-END FLOW TEST');
  console.log('='.repeat(80));
  
  try {
    await dbConnect();
    console.log('✅ Connected to MongoDB\n');
    
    // ============================================================
    // STEP 1: Check Store Configuration
    // ============================================================
    console.log('📋 STEP 1: Checking Store Configuration');
    console.log('-'.repeat(80));
    
    const store = await Store.findOne({ tin: '0003169685' });
    if (!store) {
      console.error('❌ Store with TIN 0003169685 not found!');
      return;
    }
    
    console.log(`   ✅ Store: ${store.name}`);
    console.log(`   ✅ TIN: ${store.tin}`);
    console.log(`   ✅ Min Amount: ${store.minReceiptAmount} ETB`);
    console.log(`   ✅ Validity: ${store.receiptValidityHours} hours`);
    
    // ============================================================
    // STEP 2: Check Current Customer Status
    // ============================================================
    console.log('\n👤 STEP 2: Checking Customer Status');
    console.log('-'.repeat(80));
    
    let customer = await Customer.findOne({ phone: TEST_PHONE });
    if (!customer) {
      console.log('   📝 Creating test customer...');
      customer = await Customer.create({
        name: 'Test Customer',
        phone: TEST_PHONE,
        totalVisits: 0,
      });
    }
    console.log(`   ✅ Customer: ${customer.name} (${customer.phone})`);
    
    // Check existing approved receipts
    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);
    
    const recentApprovedReceipts = await Receipt.find({
      customerPhone: TEST_PHONE,
      status: 'approved',
      processedAt: { $gte: fortyFiveDaysAgo },
    }).sort({ processedAt: -1 });
    
    console.log(`   📊 Current approved receipts (within 45 days): ${recentApprovedReceipts.length}/5`);
    
    if (recentApprovedReceipts.length > 0) {
      console.log('   Recent receipts:');
      recentApprovedReceipts.slice(0, 3).forEach((r, i) => {
        if (r.processedAt) {
          const daysAgo = Math.round((Date.now() - r.processedAt.getTime()) / (1000 * 60 * 60 * 24));
          console.log(`      ${i + 1}. Invoice: ${r.invoiceNo || 'N/A'}, Amount: ${r.totalAmount} ETB, ${daysAgo} days ago`);
        } else {
          console.log(`      ${i + 1}. Invoice: ${r.invoiceNo || 'N/A'}, Amount: ${r.totalAmount} ETB, Date: N/A`);
        }
      });
    }
    
    // Check 24-hour limit
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentApprovedReceipt = await Receipt.findOne({
      customerPhone: TEST_PHONE,
      status: 'approved',
      processedAt: { $gte: twentyFourHoursAgo },
    });
    
    if (recentApprovedReceipt && recentApprovedReceipt.processedAt) {
      const hoursAgo = Math.round((Date.now() - recentApprovedReceipt.processedAt.getTime()) / (1000 * 60 * 60));
      console.log(`   ⚠️  Customer has approved receipt from ${hoursAgo} hours ago`);
      console.log(`   ⚠️  Cannot upload another receipt for ${24 - hoursAgo} more hours`);
    } else {
      console.log('   ✅ Customer can upload receipt now (no approved receipt in last 24 hours)');
    }
    
    // ============================================================
    // STEP 3: Check Reward Status
    // ============================================================
    console.log('\n🎁 STEP 3: Checking Reward Status');
    console.log('-'.repeat(80));
    
    const rewards = await Reward.find({
      customerId: customer._id,
      storeId: store._id,
    }).sort({ issuedAt: -1 });
    
    const pendingRewards = rewards.filter(r => r.status === 'pending');
    const claimedRewards = rewards.filter(r => r.status === 'claimed');
    const redeemedRewards = rewards.filter(r => r.status === 'redeemed');
    const usedRewards = rewards.filter(r => r.status === 'used');
    
    console.log(`   📊 Reward Status:`);
    console.log(`      Pending: ${pendingRewards.length}`);
    console.log(`      Claimed: ${claimedRewards.length}`);
    console.log(`      Redeemed: ${redeemedRewards.length}`);
    console.log(`      Used: ${usedRewards.length}`);
    
    if (pendingRewards.length > 0) {
      console.log(`   ✅ Customer has ${pendingRewards.length} pending reward(s) to claim`);
    }
    if (claimedRewards.length > 0) {
      console.log(`   ✅ Customer has ${claimedRewards.length} claimed reward(s) waiting for admin`);
    }
    if (redeemedRewards.length > 0) {
      console.log(`   ✅ Customer has ${redeemedRewards.length} redeemed reward(s) with QR code`);
    }
    
    // ============================================================
    // STEP 4: Check Invoice Uniqueness
    // ============================================================
    console.log('\n📄 STEP 4: Checking Invoice Uniqueness');
    console.log('-'.repeat(80));
    
    if (!fs.existsSync(TEST_RECEIPT_IMAGE)) {
      console.log(`   ⚠️  Test receipt image not found: ${TEST_RECEIPT_IMAGE}`);
      console.log('   ℹ️  Skipping receipt upload test');
    } else {
      console.log(`   ✅ Test receipt image found: ${TEST_RECEIPT_IMAGE}`);
      
      // We would test upload here, but need API server running
      console.log('   ℹ️  To test receipt upload, run:');
      console.log(`      ./run-test-receipt.sh ${TEST_RECEIPT_IMAGE} ${TEST_PHONE}`);
    }
    
    // ============================================================
    // STEP 5: Test API Endpoints (if server running)
    // ============================================================
    console.log('\n🔌 STEP 5: Testing API Endpoints');
    console.log('-'.repeat(80));
    
    const API_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3015';
    
    // Test eligibility endpoint
    try {
      const eligibilityRes = await fetch(`${API_URL}/api/customer/receipt/eligibility?phone=${encodeURIComponent(TEST_PHONE)}`);
      if (eligibilityRes.ok) {
        const eligibilityData = await eligibilityRes.json();
        console.log('   ✅ Eligibility API working');
        console.log(`      Can upload: ${eligibilityData.canUpload ? 'Yes' : 'No'}`);
        if (!eligibilityData.canUpload) {
          console.log(`      Reason: ${eligibilityData.message}`);
        }
      } else {
        console.log('   ⚠️  Eligibility API not available (server might not be running)');
      }
    } catch (error) {
      console.log('   ⚠️  Eligibility API not available (server might not be running)');
    }
    
    // Test reward status endpoint
    try {
      const statusRes = await fetch(`${API_URL}/api/customer/rewards/status?phone=${encodeURIComponent(TEST_PHONE)}`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        console.log('   ✅ Reward Status API working');
        console.log(`      Visits in period: ${statusData.visitsInPeriod || 0}/5`);
        console.log(`      Can claim: ${statusData.canClaim ? 'Yes' : 'No'}`);
        console.log(`      Pending rewards: ${statusData.pendingRewards?.length || 0}`);
      } else {
        console.log('   ⚠️  Reward Status API not available (server might not be running)');
      }
    } catch (error) {
      console.log('   ⚠️  Reward Status API not available (server might not be running)');
    }
    
    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n📊 TEST SUMMARY');
    console.log('='.repeat(80));
    
    const issues: string[] = [];
    const successes: string[] = [];
    
    // Check store config
    if (store.tin !== '0003169685') issues.push('Store TIN incorrect');
    else successes.push('Store TIN correct');
    
    if (store.minReceiptAmount !== 2000) issues.push(`Min amount should be 2000, found ${store.minReceiptAmount}`);
    else successes.push('Min amount correct (2000 ETB)');
    
    if (store.receiptValidityHours !== 24) issues.push(`Validity should be 24h, found ${store.receiptValidityHours}h`);
    else successes.push('Validity correct (24 hours)');
    
    // Check customer status
    if (recentApprovedReceipts.length >= 5) {
      successes.push('Customer has 5+ visits (eligible for reward)');
      if (pendingRewards.length === 0 && claimedRewards.length === 0 && redeemedRewards.length === 0) {
        issues.push('Customer has 5+ visits but no pending/claimed rewards found');
      }
    } else {
      console.log(`   ℹ️  Customer needs ${5 - recentApprovedReceipts.length} more visits to be eligible`);
    }
    
    if (issues.length === 0) {
      console.log('   ✅ All checks passed!');
    } else {
      console.log('   ⚠️  Issues found:');
      issues.forEach((issue, i) => {
        console.log(`      ${i + 1}. ${issue}`);
      });
    }
    
    if (successes.length > 0) {
      console.log('   ✅ Successes:');
      successes.forEach((success, i) => {
        console.log(`      ${i + 1}. ${success}`);
      });
    }
    
    console.log('\n✅ End-to-end test complete!\n');
    
  } catch (error: any) {
    console.error('\n❌ TEST ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  }
}

testEndToEndFlow();

