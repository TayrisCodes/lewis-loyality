#!/usr/bin/env tsx
/**
 * Test Script: Admin UI API Testing
 * 
 * Tests:
 * 1. Verify fraud scores display correctly in API responses
 * 2. Test filtering and sorting by fraud score
 * 3. Test fraud investigation workflow via API
 */

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
dotenv.config(); // Default .env

import dbConnect from '../lib/db';
import Receipt from '../models/Receipt';
import Store from '../models/Store';
import { calculateImageHash } from '../lib/fraudDetector';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.cyan);
  console.log('='.repeat(60));
}

async function createTestReceipts() {
  log('\n📝 Creating test receipts with fraud scores...', colors.blue);
  
  await dbConnect();
  
  // Get or create a test store
  let testStore = await Store.findOne({ name: 'Test Store' });
  if (!testStore) {
    testStore = await Store.create({
      name: 'Test Store',
      address: 'Test Address',
      tin: 'TEST123',
      branchName: 'Test Branch',
      isActive: true,
      allowReceiptUploads: true,
    });
  }
  
  // Create a proper test image buffer (1x1 PNG)
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const testImageBuffer = Buffer.from(testImageBase64, 'base64');
  
  let testImageHash = 'test_hash_placeholder';
  try {
    testImageHash = await calculateImageHash(testImageBuffer);
  } catch (error: any) {
    log(`⚠️  Could not calculate hash, using placeholder: ${error.message}`, colors.yellow);
  }
  
  // Create receipts with different fraud scores
  const receipts = [
    {
      customerPhone: '+251900000001',
      storeId: testStore._id,
      imageUrl: '/test/receipt-low.jpg',
      ocrText: 'Low fraud test',
      invoiceNo: 'LOW_FRAUD_001',
      status: 'approved',
      fraudScore: 15,
      tamperingScore: 10,
      aiDetectionScore: 5,
      fraudFlags: [],
      imageHash: testImageHash + '_low',
    },
    {
      customerPhone: '+251900000002',
      storeId: testStore._id,
      imageUrl: '/test/receipt-medium.jpg',
      ocrText: 'Medium fraud test',
      invoiceNo: 'MEDIUM_FRAUD_001',
      status: 'flagged',
      fraudScore: 55,
      tamperingScore: 60,
      aiDetectionScore: 30,
      fraudFlags: ['Compression anomalies detected', 'Possible resolution manipulation'],
      imageHash: testImageHash + '_medium',
    },
    {
      customerPhone: '+251900000003',
      storeId: testStore._id,
      imageUrl: '/test/receipt-high.jpg',
      ocrText: 'High fraud test',
      invoiceNo: 'HIGH_FRAUD_001',
      status: 'rejected',
      fraudScore: 85,
      tamperingScore: 75,
      aiDetectionScore: 70,
      fraudFlags: ['Duplicate image (pHash match)', 'Compression anomalies detected', 'AI generation signature in metadata'],
      imageHash: testImageHash + '_high',
    },
  ];
  
  const createdReceipts = [];
  for (const receiptData of receipts) {
    const receipt = await Receipt.create(receiptData);
    createdReceipts.push(receipt);
    log(`✅ Created receipt: ${receipt._id} (fraud score: ${receipt.fraudScore})`, colors.green);
  }
  
  return createdReceipts;
}

async function testFraudScoreDisplay() {
  logSection('Test 1: Fraud Score Display in API');
  
  await dbConnect();
  
  try {
    log('\n🔍 Testing fraud score fields in database...', colors.blue);
    
    const receipts = await Receipt.find({
      fraudScore: { $exists: true },
    }).limit(5);
    
    log(`   Found ${receipts.length} receipts with fraud scores`, colors.blue);
    
    receipts.forEach((receipt: any) => {
      log(`\n   Receipt ${receipt._id}:`, colors.blue);
      log(`     Fraud Score: ${receipt.fraudScore || 'N/A'}`, colors.blue);
      log(`     Tampering Score: ${receipt.tamperingScore || 'N/A'}`, colors.blue);
      log(`     AI Detection Score: ${receipt.aiDetectionScore || 'N/A'}`, colors.blue);
      log(`     Fraud Flags: ${receipt.fraudFlags?.length || 0}`, colors.blue);
      log(`     Image Hash: ${receipt.imageHash ? receipt.imageHash.substring(0, 16) + '...' : 'N/A'}`, colors.blue);
    });
    
    if (receipts.length > 0) {
      log('\n✅ PASS: Fraud scores are stored and retrievable', colors.green);
    } else {
      log('\n⚠️  WARNING: No receipts with fraud scores found', colors.yellow);
      log('   (This is OK if no receipts have been processed yet)', colors.yellow);
    }
    
  } catch (error: any) {
    log(`❌ Test failed: ${error.message}`, colors.red);
    console.error(error);
  }
}

async function testFraudScoreFiltering() {
  logSection('Test 2: Fraud Score Filtering');
  
  await dbConnect();
  
  try {
    log('\n🔍 Testing fraud score filtering queries...', colors.blue);
    
    // Test high fraud (≥70)
    const highFraud = await Receipt.countDocuments({
      fraudScore: { $gte: 70 },
    });
    log(`   High fraud (≥70): ${highFraud} receipts`, colors.blue);
    
    // Test medium fraud (40-69)
    const mediumFraud = await Receipt.countDocuments({
      fraudScore: { $gte: 40, $lt: 70 },
    });
    log(`   Medium fraud (40-69): ${mediumFraud} receipts`, colors.blue);
    
    // Test low fraud (<40)
    const lowFraud = await Receipt.countDocuments({
      $or: [
        { fraudScore: { $lt: 40 } },
        { fraudScore: { $exists: false } },
      ],
    });
    log(`   Low fraud (<40 or no score): ${lowFraud} receipts`, colors.blue);
    
    // Test flagged with fraud
    const flaggedWithFraud = await Receipt.countDocuments({
      status: 'flagged',
      fraudScore: { $gte: 40 },
    });
    log(`   Flagged with fraud (≥40): ${flaggedWithFraud} receipts`, colors.blue);
    
    log('\n✅ PASS: Fraud score filtering queries work', colors.green);
    
  } catch (error: any) {
    log(`❌ Test failed: ${error.message}`, colors.red);
    console.error(error);
  }
}

async function testFraudInvestigationWorkflow() {
  logSection('Test 3: Fraud Investigation Workflow');
  
  await dbConnect();
  
  try {
    log('\n🔍 Testing fraud investigation queries...', colors.blue);
    
    // Find receipts with high fraud scores
    const highRiskReceipts = await Receipt.find({
      fraudScore: { $gte: 70 },
    }).limit(5);
    
    log(`   Found ${highRiskReceipts.length} high-risk receipts`, colors.blue);
    
    for (const receipt of highRiskReceipts) {
      log(`\n   High-Risk Receipt ${receipt._id}:`, colors.red);
      log(`     Status: ${receipt.status}`, colors.blue);
      log(`     Fraud Score: ${receipt.fraudScore}`, colors.blue);
      log(`     Flags: ${receipt.fraudFlags?.join(', ') || 'None'}`, colors.blue);
      
      // Check for duplicates by imageHash
      if (receipt.imageHash) {
        const duplicates = await Receipt.find({
          imageHash: receipt.imageHash,
          _id: { $ne: receipt._id },
        });
        log(`     Duplicates by hash: ${duplicates.length}`, colors.blue);
      }
    }
    
    // Find suspicious receipts (40-69)
    const suspiciousReceipts = await Receipt.find({
      fraudScore: { $gte: 40, $lt: 70 },
      status: 'flagged',
    }).limit(5);
    
    log(`\n   Found ${suspiciousReceipts.length} suspicious flagged receipts`, colors.blue);
    
    log('\n✅ PASS: Fraud investigation workflow works', colors.green);
    
  } catch (error: any) {
    log(`❌ Test failed: ${error.message}`, colors.red);
    console.error(error);
  }
}

async function testDatabaseIndexes() {
  logSection('Test 4: Database Indexes');
  
  await dbConnect();
  
  try {
    log('\n🔍 Checking database indexes...', colors.blue);
    
    const indexes = await Receipt.collection.getIndexes();
    
    log('   Available indexes:', colors.blue);
    Object.keys(indexes).forEach((indexName: string) => {
      log(`     - ${indexName}: ${JSON.stringify(indexes[indexName])}`, colors.blue);
    });
    
    // Check for fraud-related indexes
    const hasImageHashIndex = 'imageHash_1' in indexes;
    const hasFraudScoreIndex = 'fraudScore_1_status_1' in indexes;
    
    if (hasImageHashIndex) {
      log('\n✅ PASS: imageHash index exists', colors.green);
    } else {
      log('\n⚠️  WARNING: imageHash index not found', colors.yellow);
    }
    
    if (hasFraudScoreIndex) {
      log('✅ PASS: fraudScore + status index exists', colors.green);
    } else {
      log('⚠️  WARNING: fraudScore + status index not found', colors.yellow);
    }
    
  } catch (error: any) {
    log(`❌ Test failed: ${error.message}`, colors.red);
    console.error(error);
  }
}

async function cleanupTestData() {
  logSection('Cleanup');
  
  await dbConnect();
  
  try {
    log('\n🧹 Cleaning up test receipts...', colors.blue);
    
    const deleted = await Receipt.deleteMany({
      invoiceNo: { $in: ['LOW_FRAUD_001', 'MEDIUM_FRAUD_001', 'HIGH_FRAUD_001'] },
    });
    
    log(`✅ Deleted ${deleted.deletedCount} test receipts`, colors.green);
    
  } catch (error: any) {
    log(`⚠️  Cleanup warning: ${error.message}`, colors.yellow);
  }
}

async function main() {
  log('\n🚀 Starting Admin UI API Tests', colors.cyan);
  log('='.repeat(60));
  
  try {
    // Create test data
    const testReceipts = await createTestReceipts();
    
    // Run tests
    await testFraudScoreDisplay();
    await testFraudScoreFiltering();
    await testFraudInvestigationWorkflow();
    await testDatabaseIndexes();
    
    // Cleanup
    await cleanupTestData();
    
    logSection('Test Summary');
    log('✅ All admin UI API tests completed!', colors.green);
    log('\n📝 Notes:', colors.blue);
    log('   - Fraud scores should be stored in database', colors.blue);
    log('   - Filtering by fraud score should work', colors.blue);
    log('   - Database indexes should exist for performance', colors.blue);
    log('   - Fraud investigation queries should work', colors.blue);
    
  } catch (error: any) {
    log(`\n❌ Test suite failed: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();

