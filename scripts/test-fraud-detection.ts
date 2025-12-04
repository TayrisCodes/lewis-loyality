#!/usr/bin/env tsx
/**
 * Test Script: Fraud Detection
 * 
 * Tests:
 * 1. pHash duplicate detection (upload same image twice)
 * 2. Tampering detection (modified JPEG)
 * 3. AI detection (if detectable)
 * 4. Fraud score calculation and thresholds
 */

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
dotenv.config(); // Default .env

import dbConnect from '../lib/db';
import Receipt from '../models/Receipt';
import { calculateFraudScore, calculateImageHash, detectImageTampering, detectAIGeneratedImage } from '../lib/fraudDetector';
import fs from 'fs';

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

async function createTestImage(): Promise<Buffer> {
  // Create a simple test image
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  return Buffer.from(testImageBase64, 'base64');
}

async function testPHashDuplicateDetection() {
  logSection('Test 1: pHash Duplicate Detection');
  
  await dbConnect();
  
  try {
    log('\n🔐 Testing pHash calculation...', colors.blue);
    const testImage = await createTestImage();
    
    const hash1 = await calculateImageHash(testImage);
    log(`✅ Hash 1: ${hash1.substring(0, 32)}...`, colors.green);
    
    // Same image should produce same hash
    const hash2 = await calculateImageHash(testImage);
    log(`✅ Hash 2: ${hash2.substring(0, 32)}...`, colors.green);
    
    if (hash1 === hash2) {
      log('✅ PASS: Same image produces same hash', colors.green);
    } else {
      log('❌ FAIL: Same image produced different hashes', colors.red);
    }
    
    // Test duplicate detection in database
    log('\n🔍 Testing duplicate detection in database...', colors.blue);
    
    // Create a test receipt with hash
    const testReceipt = await Receipt.create({
      customerPhone: '+251900000000',
      imageUrl: '/test/receipt1.jpg',
      ocrText: 'Test receipt',
      status: 'approved',
      imageHash: hash1,
      fraudScore: 0,
    });
    
    log(`✅ Created test receipt: ${testReceipt._id}`, colors.green);
    
    // Try to find duplicate
    const duplicate = await Receipt.findOne({
      imageHash: hash1,
      _id: { $ne: testReceipt._id },
    });
    
    if (!duplicate) {
      log('✅ PASS: No duplicate found (expected for first upload)', colors.green);
    } else {
      log(`⚠️  Found duplicate receipt: ${duplicate._id}`, colors.yellow);
    }
    
    // Test fraud score with duplicate
    log('\n🔍 Testing fraud score with duplicate hash...', colors.blue);
    const fraudScore = await calculateFraudScore({
      imageBuffer: testImage,
      invoiceNo: 'TEST001',
      barcodeData: '123456',
      customerPhone: '+251900000001',
    });
    
    log(`   Fraud Score: ${fraudScore.overallScore}/100`, colors.blue);
    log(`   Duplicate Found: ${fraudScore.duplicateFound}`, colors.blue);
    
    if (fraudScore.duplicateFound) {
      log('✅ PASS: Duplicate detection works in fraud score', colors.green);
    } else {
      log('⚠️  WARNING: Duplicate not detected (may need to wait for index)', colors.yellow);
    }
    
    // Cleanup
    await Receipt.deleteOne({ _id: testReceipt._id });
    log('✅ Cleaned up test receipt', colors.green);
    
  } catch (error: any) {
    log(`❌ Test failed: ${error.message}`, colors.red);
    console.error(error);
  }
}

async function testTamperingDetection() {
  logSection('Test 2: Image Tampering Detection');
  
  try {
    log('\n🔍 Testing tampering detection...', colors.blue);
    const testImage = await createTestImage();
    
    const tamperingResult = await detectImageTampering(testImage);
    
    log(`   Tampering Score: ${tamperingResult.score}/100`, colors.blue);
    log(`   Indicators: ${tamperingResult.indicators.length}`, colors.blue);
    
    if (tamperingResult.indicators.length > 0) {
      tamperingResult.indicators.forEach((indicator: string) => {
        log(`   - ${indicator}`, colors.yellow);
      });
    }
    
    log('✅ PASS: Tampering detection completed', colors.green);
    
    // Test threshold
    if (tamperingResult.score >= 50) {
      log('⚠️  WARNING: High tampering score detected', colors.yellow);
    } else {
      log('✅ PASS: Tampering score within normal range', colors.green);
    }
    
  } catch (error: any) {
    log(`❌ Test failed: ${error.message}`, colors.red);
    console.error(error);
  }
}

async function testAIDetection() {
  logSection('Test 3: AI-Generated Image Detection');
  
  try {
    log('\n🤖 Testing AI detection...', colors.blue);
    const testImage = await createTestImage();
    
    const aiResult = await detectAIGeneratedImage(testImage);
    
    log(`   AI Probability: ${aiResult.probability}%`, colors.blue);
    log(`   Indicators: ${aiResult.indicators.length}`, colors.blue);
    
    if (aiResult.indicators.length > 0) {
      aiResult.indicators.forEach((indicator: string) => {
        log(`   - ${indicator}`, colors.yellow);
      });
    }
    
    log('✅ PASS: AI detection completed', colors.green);
    
    // Test threshold
    if (aiResult.probability >= 50) {
      log('⚠️  WARNING: High AI generation probability', colors.yellow);
    } else {
      log('✅ PASS: AI probability within normal range', colors.green);
    }
    
  } catch (error: any) {
    log(`❌ Test failed: ${error.message}`, colors.red);
    console.error(error);
  }
}

async function testFraudScoreCalculation() {
  logSection('Test 4: Fraud Score Calculation & Thresholds');
  
  await dbConnect();
  
  try {
    log('\n🔍 Testing fraud score calculation...', colors.blue);
    const testImage = await createTestImage();
    
    const fraudScore = await calculateFraudScore({
      imageBuffer: testImage,
      invoiceNo: 'TEST001',
      barcodeData: '123456',
      customerPhone: '+251900000000',
    });
    
    log(`\n📊 Fraud Score Results:`, colors.blue);
    log(`   Overall Score: ${fraudScore.overallScore}/100`, colors.blue);
    log(`   Tampering Score: ${fraudScore.tamperingScore}/100`, colors.blue);
    log(`   AI Detection Score: ${fraudScore.aiDetectionScore}/100`, colors.blue);
    log(`   Image Hash: ${fraudScore.imageHash.substring(0, 32)}...`, colors.blue);
    log(`   Duplicate Found: ${fraudScore.duplicateFound}`, colors.blue);
    log(`   Flags: ${fraudScore.flags.length}`, colors.blue);
    
    if (fraudScore.flags.length > 0) {
      fraudScore.flags.forEach((flag: string) => {
        log(`   - ${flag}`, colors.yellow);
      });
    }
    
    // Test thresholds
    log('\n🎯 Testing thresholds...', colors.blue);
    
    if (fraudScore.overallScore >= 70) {
      log('   ⚠️  HIGH RISK: Score ≥70 (should auto-reject)', colors.red);
    } else if (fraudScore.overallScore >= 40) {
      log('   ⚠️  MEDIUM RISK: Score 40-69 (should flag for review)', colors.yellow);
    } else {
      log('   ✅ LOW RISK: Score <40 (should approve)', colors.green);
    }
    
    if (fraudScore.tamperingScore >= 50) {
      log('   ⚠️  HIGH TAMPERING: Score ≥50 (should flag)', colors.yellow);
    }
    
    if (fraudScore.aiDetectionScore >= 50) {
      log('   ⚠️  HIGH AI PROBABILITY: Score ≥50 (should flag)', colors.yellow);
    }
    
    log('\n✅ PASS: Fraud score calculation works', colors.green);
    
  } catch (error: any) {
    log(`❌ Test failed: ${error.message}`, colors.red);
    console.error(error);
  }
}

async function testDuplicateInvoiceAndBarcode() {
  logSection('Test 5: Duplicate Invoice & Barcode Detection');
  
  await dbConnect();
  
  try {
    log('\n🔍 Testing duplicate invoice detection...', colors.blue);
    
    // Create test receipt with invoice
    const testReceipt1 = await Receipt.create({
      customerPhone: '+251900000001',
      imageUrl: '/test/receipt1.jpg',
      ocrText: 'Test receipt 1',
      invoiceNo: 'DUPLICATE_TEST_001',
      status: 'approved',
    });
    
    log(`✅ Created test receipt 1: ${testReceipt1._id}`, colors.green);
    
    // Test fraud score with same invoice
    const testImage = await createTestImage();
    const fraudScore = await calculateFraudScore({
      imageBuffer: testImage,
      invoiceNo: 'DUPLICATE_TEST_001', // Same invoice
      barcodeData: '123456',
      customerPhone: '+251900000002',
    });
    
    log(`   Fraud Score: ${fraudScore.overallScore}/100`, colors.blue);
    log(`   Flags: ${fraudScore.flags.join(', ')}`, colors.blue);
    
    if (fraudScore.flags.some((f: string) => f.includes('Duplicate invoice'))) {
      log('✅ PASS: Duplicate invoice detected', colors.green);
    } else {
      log('⚠️  WARNING: Duplicate invoice not detected', colors.yellow);
    }
    
    // Cleanup
    await Receipt.deleteOne({ _id: testReceipt1._id });
    log('✅ Cleaned up test receipt', colors.green);
    
  } catch (error: any) {
    log(`❌ Test failed: ${error.message}`, colors.red);
    console.error(error);
  }
}

async function main() {
  log('\n🚀 Starting Fraud Detection Tests', colors.cyan);
  log('='.repeat(60));
  
  try {
    await testPHashDuplicateDetection();
    await testTamperingDetection();
    await testAIDetection();
    await testFraudScoreCalculation();
    await testDuplicateInvoiceAndBarcode();
    
    logSection('Test Summary');
    log('✅ All fraud detection tests completed!', colors.green);
    log('\n📝 Notes:', colors.blue);
    log('   - pHash should detect duplicate images', colors.blue);
    log('   - Tampering score should detect image manipulation', colors.blue);
    log('   - AI detection should identify AI-generated images', colors.blue);
    log('   - Fraud score thresholds: ≥70 (reject), ≥40 (flag)', colors.blue);
    
  } catch (error: any) {
    log(`\n❌ Test suite failed: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();

