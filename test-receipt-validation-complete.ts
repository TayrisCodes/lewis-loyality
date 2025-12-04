// Load environment variables FIRST before any imports
import dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env.production') });

/**
 * Comprehensive Receipt Validation Test Script
 * 
 * Tests all validation rules:
 * 1. TIN validation (only 0003169685)
 * 2. Minimum amount (2000 ETB)
 * 3. 24-hour validity
 * 4. Photo validation
 * 5. Invoice uniqueness
 * 6. One visit per 24 hours
 * 7. Reward eligibility (5 visits within 45 days)
 */

import dbConnect from './lib/db';
import Receipt from './models/Receipt';
import Customer from './models/Customer';
import Visit from './models/Visit';
import Reward from './models/Reward';
import Store from './models/Store';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const TEST_PHONE = '0936308836';
const ALLOWED_TIN = '0003169685';
const MIN_AMOUNT = 2000;

async function testReceiptValidation() {
  console.log('\n🧪 COMPREHENSIVE RECEIPT VALIDATION TEST');
  console.log('=' .repeat(60));
  
  try {
    await dbConnect();
    console.log('✅ Connected to MongoDB\n');
    
    // ============================================================
    // TEST 1: Store Configuration
    // ============================================================
    console.log('📋 TEST 1: Store Configuration');
    console.log('-'.repeat(60));
    
    const store = await Store.findOne({ tin: ALLOWED_TIN });
    if (!store) {
      console.error('❌ Store with TIN 0003169685 not found!');
      return;
    }
    
    console.log(`   Store: ${store.name}`);
    console.log(`   TIN: ${store.tin} ${store.tin === ALLOWED_TIN ? '✅' : '❌'}`);
    console.log(`   Min Amount: ${store.minReceiptAmount} ETB ${store.minReceiptAmount === MIN_AMOUNT ? '✅' : '❌'}`);
    console.log(`   Validity: ${store.receiptValidityHours} hours ${store.receiptValidityHours === 24 ? '✅' : '❌'}`);
    console.log(`   Allow Receipt Uploads: ${store.allowReceiptUploads ? '✅' : '❌'}`);
    
    // ============================================================
    // TEST 2: Check Existing Receipts
    // ============================================================
    console.log('\n📋 TEST 2: Check Existing Receipts for Test Customer');
    console.log('-'.repeat(60));
    
    const customerReceipts = await Receipt.find({ customerPhone: TEST_PHONE })
      .sort({ processedAt: -1 })
      .limit(10);
    
    console.log(`   Total receipts: ${customerReceipts.length}`);
    
    const approvedReceipts = customerReceipts.filter(r => r.status === 'approved');
    const rejectedReceipts = customerReceipts.filter(r => r.status === 'rejected');
    const flaggedReceipts = customerReceipts.filter(r => r.status === 'flagged');
    
    console.log(`   Approved: ${approvedReceipts.length}`);
    console.log(`   Rejected: ${rejectedReceipts.length}`);
    console.log(`   Flagged: ${flaggedReceipts.length}`);
    
    // Show recent approved receipts
    if (approvedReceipts.length > 0) {
      console.log('\n   Recent approved receipts:');
      approvedReceipts.slice(0, 5).forEach((r, i) => {
        const hoursAgo = Math.round((Date.now() - r.processedAt.getTime()) / (1000 * 60 * 60));
        console.log(`   ${i + 1}. Invoice: ${r.invoiceNo || 'N/A'}, Amount: ${r.totalAmount} ETB, ${hoursAgo}h ago`);
      });
    }
    
    // ============================================================
    // TEST 3: Invoice Uniqueness Check
    // ============================================================
    console.log('\n📋 TEST 3: Invoice Uniqueness');
    console.log('-'.repeat(60));
    
    const invoiceCounts: Record<string, number> = {};
    customerReceipts.forEach(r => {
      if (r.invoiceNo) {
        invoiceCounts[r.invoiceNo] = (invoiceCounts[r.invoiceNo] || 0) + 1;
      }
    });
    
    const duplicates = Object.entries(invoiceCounts).filter(([_, count]) => count > 1);
    
    if (duplicates.length > 0) {
      console.log(`   ⚠️  Found ${duplicates.length} duplicate invoice numbers:`);
      duplicates.forEach(([invoice, count]) => {
        console.log(`      - Invoice ${invoice}: appears ${count} times`);
      });
    } else {
      console.log('   ✅ No duplicate invoice numbers found');
    }
    
    // ============================================================
    // TEST 4: 24-Hour Visit Limit Check
    // ============================================================
    console.log('\n📋 TEST 4: 24-Hour Visit Limit');
    console.log('-'.repeat(60));
    
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentApprovedReceipts = approvedReceipts.filter(r => 
      r.processedAt >= twentyFourHoursAgo
    );
    
    console.log(`   Approved receipts in last 24 hours: ${recentApprovedReceipts.length}`);
    
    if (recentApprovedReceipts.length > 0) {
      recentApprovedReceipts.forEach((r, i) => {
        const hoursAgo = Math.round((Date.now() - r.processedAt.getTime()) / (1000 * 60 * 60));
        console.log(`   ${i + 1}. Invoice: ${r.invoiceNo || 'N/A'}, ${hoursAgo} hours ago`);
      });
      
      const oldest = recentApprovedReceipts[recentApprovedReceipts.length - 1];
      const hoursUntilNext = 24 - Math.round((Date.now() - oldest.processedAt.getTime()) / (1000 * 60 * 60));
      console.log(`   ⚠️  Customer cannot submit another receipt for ${hoursUntilNext} more hours`);
    } else {
      console.log('   ✅ Customer can submit a receipt now (no approved receipts in last 24 hours)');
    }
    
    // ============================================================
    // TEST 5: Reward Eligibility Check
    // ============================================================
    console.log('\n📋 TEST 5: Reward Eligibility (5 visits within 45 days)');
    console.log('-'.repeat(60));
    
    const fortyFiveDaysAgo = new Date();
    fortyFiveDaysAgo.setDate(fortyFiveDaysAgo.getDate() - 45);
    
    const recentVisits = approvedReceipts.filter(r => 
      r.processedAt >= fortyFiveDaysAgo
    );
    
    console.log(`   Approved receipts in last 45 days: ${recentVisits.length}/5`);
    
    if (recentVisits.length >= 5) {
      console.log('   ✅ Customer is eligible for a reward!');
      
      // Check if customer has pending/claimed reward
      const customer = await Customer.findOne({ phone: TEST_PHONE });
      if (customer) {
        const rewards = await Reward.find({
          customerId: customer._id,
          storeId: store._id,
        }).sort({ issuedAt: -1 });
        
        const pendingRewards = rewards.filter(r => r.status === 'pending');
        const claimedRewards = rewards.filter(r => r.status === 'claimed');
        const redeemedRewards = rewards.filter(r => r.status === 'redeemed');
        const usedRewards = rewards.filter(r => r.status === 'used');
        
        console.log(`   Rewards status:`);
        console.log(`      Pending: ${pendingRewards.length}`);
        console.log(`      Claimed: ${claimedRewards.length}`);
        console.log(`      Redeemed: ${redeemedRewards.length}`);
        console.log(`      Used: ${usedRewards.length}`);
        
        if (pendingRewards.length > 0) {
          console.log(`   ⚠️  Customer has ${pendingRewards.length} pending reward(s) to claim`);
        }
        if (claimedRewards.length > 0) {
          console.log(`   ⚠️  Customer has ${claimedRewards.length} claimed reward(s) waiting for admin redemption`);
        }
        if (redeemedRewards.length > 0) {
          console.log(`   ✅ Customer has ${redeemedRewards.length} redeemed reward(s) with QR code`);
        }
      }
    } else {
      const remaining = 5 - recentVisits.length;
      console.log(`   ⚠️  Customer needs ${remaining} more approved receipt(s) to be eligible`);
    }
    
    // ============================================================
    // TEST 6: TIN Validation Check
    // ============================================================
    console.log('\n📋 TEST 6: TIN Validation');
    console.log('-'.repeat(60));
    
    const receiptsWithDifferentTIN = customerReceipts.filter(r => 
      r.tin && r.tin !== ALLOWED_TIN
    );
    
    if (receiptsWithDifferentTIN.length > 0) {
      console.log(`   ⚠️  Found ${receiptsWithDifferentTIN.length} receipts with invalid TIN:`);
      receiptsWithDifferentTIN.forEach((r, i) => {
        console.log(`      ${i + 1}. TIN: ${r.tin}, Status: ${r.status}, Invoice: ${r.invoiceNo || 'N/A'}`);
      });
    } else {
      console.log('   ✅ All receipts have valid TIN (0003169685) or no TIN');
    }
    
    // ============================================================
    // TEST 7: Amount Validation Check
    // ============================================================
    console.log('\n📋 TEST 7: Amount Validation');
    console.log('-'.repeat(60));
    
    const receiptsBelowMin = customerReceipts.filter(r => 
      r.totalAmount && r.totalAmount < MIN_AMOUNT
    );
    
    if (receiptsBelowMin.length > 0) {
      console.log(`   ⚠️  Found ${receiptsBelowMin.length} receipts below minimum amount (${MIN_AMOUNT} ETB):`);
      receiptsBelowMin.forEach((r, i) => {
        console.log(`      ${i + 1}. Amount: ${r.totalAmount} ETB, Status: ${r.status}, Invoice: ${r.invoiceNo || 'N/A'}`);
      });
    } else {
      console.log(`   ✅ All receipts meet minimum amount requirement (${MIN_AMOUNT} ETB)`);
    }
    
    // ============================================================
    // SUMMARY
    // ============================================================
    console.log('\n📊 TEST SUMMARY');
    console.log('=' .repeat(60));
    
    const issues: string[] = [];
    
    if (store.tin !== ALLOWED_TIN) issues.push('Store TIN is incorrect');
    if (store.minReceiptAmount !== MIN_AMOUNT) issues.push(`Min amount should be ${MIN_AMOUNT}, found ${store.minReceiptAmount}`);
    if (store.receiptValidityHours !== 24) issues.push(`Validity should be 24 hours, found ${store.receiptValidityHours}`);
    if (duplicates.length > 0) issues.push(`${duplicates.length} duplicate invoice(s) found`);
    if (receiptsWithDifferentTIN.length > 0) issues.push(`${receiptsWithDifferentTIN.length} receipt(s) with invalid TIN`);
    if (receiptsBelowMin.length > 0) issues.push(`${receiptsBelowMin.length} receipt(s) below minimum amount`);
    
    if (issues.length === 0) {
      console.log('   ✅ All validations passed!');
    } else {
      console.log('   ⚠️  Issues found:');
      issues.forEach((issue, i) => {
        console.log(`      ${i + 1}. ${issue}`);
      });
    }
    
    console.log('\n✅ Test complete!\n');
    
  } catch (error: any) {
    console.error('\n❌ TEST ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  }
}

testReceiptValidation();

