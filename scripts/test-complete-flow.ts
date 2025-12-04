/**
 * Complete End-to-End Test: Receipt Upload → Validation → Visitor Count → Reward
 * 
 * Tests the entire flow:
 * 1. Receipt upload
 * 2. OCR extraction (with PaddleOCR fallback)
 * 3. Fraud detection
 * 4. Receipt validation
 * 5. Visitor counting
 * 6. Reward distribution
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

import dbConnect from '../lib/db';
import Store from '../models/Store';
import Customer from '../models/Customer';
import Receipt from '../models/Receipt';
import Visit from '../models/Visit';
import Reward from '../models/Reward';
import RewardRule from '../models/RewardRule';
import { validateAndProcessReceipt } from '../lib/receiptValidator';

// Create a minimal test image (1x1 PNG)
const createTestImage = (): Buffer => {
  // Minimal valid PNG (1x1 pixel, transparent)
  const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  return Buffer.from(pngBase64, 'base64');
};

async function testCompleteFlow() {
  console.log('\n🚀 Complete Flow Test: Receipt Upload → Validation → Visitor Count → Reward');
  console.log('='.repeat(80));

  try {
    await dbConnect();
    console.log('✅ Connected to database\n');

    // Step 1: Setup test data
    console.log('📋 Step 1: Setting up test data...');
    
    // Find or create a test store
    let store = await Store.findOne({ name: 'Test Store - Complete Flow' });
    if (!store) {
      // Generate unique qrToken to avoid duplicate key error
      const crypto = require('crypto');
      const uniqueQrToken = crypto.randomBytes(16).toString('hex');
      
      store = await Store.create({
        name: 'Test Store - Complete Flow',
        tin: 'TEST123456',
        address: '123 Test Street',
        phone: '+1234567890',
        email: 'test@example.com',
        minPurchaseAmount: 500,
        maxDailyVisits: 1,
        isActive: true,
        qrToken: uniqueQrToken,
      });
      console.log(`   ✅ Created test store: ${store._id}`);
    } else {
      console.log(`   ✅ Using existing test store: ${store._id}`);
    }

    // Find or create a test customer
    const testPhone = '+1234567890';
    let customer = await Customer.findOne({ phone: testPhone });
    if (!customer) {
      customer = await Customer.create({
        phone: testPhone,
        name: 'Test Customer',
        email: 'testcustomer@example.com',
        isActive: true,
      });
      console.log(`   ✅ Created test customer: ${customer._id}`);
    } else {
      console.log(`   ✅ Using existing test customer: ${customer._id}`);
    }

    // Create or update reward rule (visit-based)
    let rewardRule = await RewardRule.findOne({ storeId: store._id, type: 'visit' });
    if (!rewardRule) {
      rewardRule = await RewardRule.create({
        storeId: store._id,
        type: 'visit',
        visitsNeeded: 3, // Reward after 3 visits
        rewardAmount: 100,
        rewardType: 'points',
        isActive: true,
      });
      console.log(`   ✅ Created reward rule: ${rewardRule._id} (Reward after ${rewardRule.visitsNeeded} visits)`);
    } else {
      console.log(`   ✅ Using existing reward rule: ${rewardRule._id}`);
    }

    // Clean up old test receipts and visits
    await Receipt.deleteMany({ 
      storeId: store._id, 
      customerPhone: testPhone,
      invoiceNo: { $regex: /^TEST-/ }
    });
    await Visit.deleteMany({ 
      storeId: store._id, 
      customerId: customer._id 
    });
    await Reward.deleteMany({ 
      customerId: customer._id,
      storeId: store._id 
    });
    console.log('   ✅ Cleaned up old test data\n');

    // Step 2: Test Receipt Upload and Validation
    console.log('📸 Step 2: Testing receipt upload and validation...');
    
    const testImage = createTestImage();
    console.log(`   📷 Test image size: ${testImage.length} bytes`);
    
    // Simulate receipt data
    const receiptData = {
      imageBuffer: testImage,
      originalFilename: 'test-receipt.png',
      storeId: String(store._id),
      customerPhone: testPhone,
    };

    console.log('   🔍 Processing receipt...');
    const validationResult = await validateAndProcessReceipt(receiptData);
    
    console.log(`   📊 Validation Result:`);
    console.log(`      - Success: ${validationResult.success}`);
    console.log(`      - Status: ${validationResult.status}`);
    console.log(`      - Reason: ${validationResult.reason}`);
    console.log(`      - Receipt ID: ${validationResult.receiptId || 'N/A'}`);
    
    if (validationResult.parsed) {
      console.log(`      - Parsed Amount: ${validationResult.parsed.totalAmount || 'N/A'}`);
      console.log(`      - Parsed Invoice: ${validationResult.parsed.invoiceNo || 'N/A'}`);
    }

    // Step 3: Verify Receipt in Database
    console.log('\n📋 Step 3: Verifying receipt in database...');
    
    if (validationResult.receiptId) {
      const savedReceipt = await Receipt.findById(validationResult.receiptId);
      if (savedReceipt) {
        console.log(`   ✅ Receipt found in database`);
        console.log(`      - Status: ${savedReceipt.status}`);
        console.log(`      - Fraud Score: ${savedReceipt.fraudScore ?? 'N/A'}`);
        console.log(`      - Tampering Score: ${savedReceipt.tamperingScore ?? 'N/A'}`);
        console.log(`      - AI Detection Score: ${savedReceipt.aiDetectionScore ?? 'N/A'}`);
        console.log(`      - Fraud Flags: ${savedReceipt.fraudFlags?.join(', ') || 'None'}`);
        console.log(`      - Image Hash: ${savedReceipt.imageHash?.substring(0, 16) || 'N/A'}...`);
      } else {
        console.log('   ❌ Receipt not found in database');
      }
    }

    // Step 4: Verify Visitor Count
    console.log('\n👥 Step 4: Verifying visitor count...');
    
    const visits = await Visit.find({ 
      storeId: store._id, 
      customerId: customer._id 
    }).sort({ createdAt: -1 });
    
    console.log(`   📊 Total visits: ${visits.length}`);
    if (visits.length > 0) {
      visits.forEach((visit, index) => {
        console.log(`      Visit ${index + 1}: ${visit.timestamp ? new Date(visit.timestamp).toISOString() : 'N/A'}`);
      });
    }

    if (validationResult.visitId) {
      const visit = await Visit.findById(validationResult.visitId);
      if (visit) {
        console.log(`   ✅ Visit recorded: ${visit._id}`);
        console.log(`      - Receipt ID: ${visit.receiptId}`);
        console.log(`      - Visit Count: ${validationResult.visitCount || 'N/A'}`);
      }
    }

    // Step 5: Verify Reward Distribution
    console.log('\n🎁 Step 5: Verifying reward distribution...');
    
    if (validationResult.rewardEarned) {
      console.log(`   ✅ Reward earned!`);
      console.log(`      - Reward ID: ${validationResult.rewardId || 'N/A'}`);
      
      if (validationResult.rewardId) {
        const reward = await Reward.findById(validationResult.rewardId);
        if (reward) {
          console.log(`      - Reward Type: ${reward.rewardType}`);
          console.log(`      - Reward Type: ${reward.rewardType}`);
          console.log(`      - Status: ${reward.status}`);
        }
      }
    } else {
      console.log(`   ℹ️  No reward earned yet`);
      const currentVisitCount = visits.length;
      const requiredVisits = rewardRule.visitsNeeded || 0;
      console.log(`      - Current visits: ${currentVisitCount}`);
      console.log(`      - Required visits: ${requiredVisits}`);
      console.log(`      - Visits remaining: ${Math.max(0, requiredVisits - currentVisitCount)}`);
    }

    // Check all rewards for this customer
    const allRewards = await Reward.find({ 
      customerId: customer._id,
      storeId: store._id 
    }).sort({ createdAt: -1 });
    
    console.log(`   📊 Total rewards: ${allRewards.length}`);
    if (allRewards.length > 0) {
      allRewards.forEach((reward, index) => {
        console.log(`      Reward ${index + 1}: ${reward.rewardType} - ${reward.rewardType} (${reward.status})`);
      });
    }

    // Step 6: Test Multiple Receipts (to trigger reward)
    console.log('\n🔄 Step 6: Testing multiple receipts to trigger reward...');
    
    const targetVisits = rewardRule.visitsNeeded || 0;
    const currentVisits = visits.length;
    const neededVisits = Math.max(0, targetVisits - currentVisits);
    
    if (neededVisits > 0) {
      console.log(`   📝 Creating ${neededVisits} additional test receipt(s)...`);
      
      for (let i = 0; i < neededVisits; i++) {
        const additionalReceipt = {
          imageBuffer: createTestImage(),
          originalFilename: `test-receipt-${i + 2}.png`,
          storeId: String(store._id),
          customerPhone: testPhone,
        };
        
        console.log(`   🔄 Processing receipt ${i + 2}...`);
        const result = await validateAndProcessReceipt(additionalReceipt);
        
        if (result.success && result.status === 'approved') {
          console.log(`      ✅ Receipt ${i + 2} approved`);
          if (result.rewardEarned) {
            console.log(`      🎁 Reward earned on receipt ${i + 2}!`);
          }
        } else {
          console.log(`      ⚠️  Receipt ${i + 2} status: ${result.status}`);
        }
        
        // Wait a bit between receipts
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Verify final state
      const finalVisits = await Visit.find({ 
        storeId: store._id, 
        customerId: customer._id 
      });
      const finalRewards = await Reward.find({ 
        customerId: customer._id,
        storeId: store._id 
      });
      
      console.log(`\n   📊 Final State:`);
      console.log(`      - Total visits: ${finalVisits.length}`);
      console.log(`      - Total rewards: ${finalRewards.length}`);
    } else {
      console.log(`   ℹ️  Already have ${currentVisits} visits, reward should trigger on next receipt`);
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('✅ Complete Flow Test Summary');
    console.log('='.repeat(80));
    
    const finalReceipts = await Receipt.find({ 
      storeId: store._id, 
      customerPhone: testPhone,
      invoiceNo: { $regex: /^TEST-/ }
    });
    const finalVisits = await Visit.find({ 
      storeId: store._id, 
      customerId: customer._id 
    });
    const finalRewards = await Reward.find({ 
      customerId: customer._id,
      storeId: store._id 
    });
    
    console.log(`📊 Test Results:`);
    console.log(`   - Receipts processed: ${finalReceipts.length}`);
    console.log(`   - Visits recorded: ${finalVisits.length}`);
    console.log(`   - Rewards earned: ${finalRewards.length}`);
    console.log(`   - Fraud detection: ${finalReceipts.some(r => r.fraudScore !== undefined) ? '✅ Working' : '⚠️  Not tested'}`);
    console.log(`   - OCR processing: ${finalReceipts.some(r => r.ocrText) ? '✅ Working' : '⚠️  Not tested'}`);
    
    console.log('\n✅ Complete flow test finished!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testCompleteFlow()
  .then(() => {
    console.log('✅ All tests completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });

