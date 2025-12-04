/**
 * Complete Receipt Flow Test
 * 
 * Tests the entire flow from receipt upload to reward creation
 * 
 * Usage:
 *   npx tsx test-receipt-flow.ts <path-to-receipt-image> <storeId> <phone>
 */

import { validateAndProcessReceipt } from './lib/receiptValidator';
import fs from 'fs';

async function testReceiptFlow(imagePath: string, storeId?: string, phone?: string) {
  console.log('\n🔍 Complete Receipt Flow Test');
  console.log('='.repeat(60));
  console.log(`Image: ${imagePath}`);
  console.log(`Store ID: ${storeId || 'Not provided (will identify from receipt)'}`);
  console.log(`Phone: ${phone || 'Not provided'}`);
  console.log('='.repeat(60));
  
  if (!fs.existsSync(imagePath)) {
    console.error(`❌ Image not found: ${imagePath}`);
    process.exit(1);
  }
  
  const imageBuffer = fs.readFileSync(imagePath);
  const imageSizeKB = Math.round(imageBuffer.length / 1024);
  console.log(`\n📁 File Info:`);
  console.log(`   Size: ${imageSizeKB} KB`);
  console.log(`   Format: ${imagePath.split('.').pop()?.toUpperCase()}`);
  
  const startTime = Date.now();
  
  try {
    console.log('\n🚀 Starting receipt validation...\n');
    
    const result = await validateAndProcessReceipt({
      imageBuffer: imageBuffer,
      originalFilename: path.basename(imagePath),
      storeId: storeId,
      customerPhone: phone,
    });
    
    const duration = Date.now() - startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION RESULT');
    console.log('='.repeat(60));
    console.log(`Status: ${result.status.toUpperCase()}`);
    console.log(`Success: ${result.success ? '✅ Yes' : '❌ No'}`);
    console.log(`Reason: ${result.reason}`);
    console.log(`Processing Time: ${duration}ms (${Math.round(duration / 1000)}s)`);
    
    if (result.receiptId) {
      console.log(`\n📄 Receipt Record:`);
      console.log(`   Receipt ID: ${result.receiptId}`);
      console.log(`   Location: /uploads/receipts/{storeId}/${result.receiptId}`);
    }
    
    if (result.visitId) {
      console.log(`\n📍 Visit Record:`);
      console.log(`   Visit ID: ${result.visitId}`);
      console.log(`   Visit Count: ${result.visitCount || 'N/A'}`);
    }
    
    if (result.rewardEarned) {
      console.log(`\n🎁 Reward Earned!`);
      console.log(`   Reward ID: ${result.rewardId || 'N/A'}`);
    }
    
    if (result.parsed) {
      console.log(`\n📋 Parsed Receipt Data:`);
      console.log(`   TIN: ${result.parsed.tin || '❌ Not found'}`);
      console.log(`   Invoice: ${result.parsed.invoiceNo || '❌ Not found'}`);
      console.log(`   Date: ${result.parsed.date || '❌ Not found'}`);
      console.log(`   Amount: ${result.parsed.totalAmount ? `${result.parsed.totalAmount} ETB` : '❌ Not found'}`);
      console.log(`   Branch: ${result.parsed.branchText || '❌ Not found'}`);
      console.log(`   Confidence: ${result.parsed.confidence.toUpperCase()}`);
    }
    
    if (result.rejectionDetails && result.rejectionDetails.length > 0) {
      console.log(`\n⚠️  Rejection Details:`);
      result.rejectionDetails.forEach((detail, index) => {
        console.log(`   ${index + 1}. [${detail.field}] ${detail.message}`);
        if (detail.found !== undefined) {
          console.log(`      Found: ${detail.found}`);
        }
        if (detail.expected !== undefined) {
          console.log(`      Expected: ${detail.expected}`);
        }
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (result.success && result.status === 'approved') {
      console.log('✅ RECEIPT APPROVED - Visit counted!');
      if (result.rewardEarned) {
        console.log('🎉 REWARD EARNED!');
      }
    } else if (result.status === 'rejected') {
      console.log('❌ RECEIPT REJECTED');
    } else if (result.status === 'flagged') {
      console.log('⚠️  RECEIPT FLAGGED - Needs admin review');
    }
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('\n❌ ERROR:', error.message);
    console.error(`   Failed after: ${duration}ms (${Math.round(duration / 1000)}s)`);
    console.error('\nStack trace:');
    console.error(error.stack);
  }
}

// Run test
const imagePath = process.argv[2];
const storeId = process.argv[3];
const phone = process.argv[4];

if (!imagePath) {
  console.error('Usage: npx tsx test-receipt-flow.ts <path-to-image> [storeId] [phone]');
  console.error('\nExample:');
  console.error('  npx tsx test-receipt-flow.ts receipt.jpg 691db9412d237909b0ee2e2e +251911234567');
  process.exit(1);
}

import path from 'path';
testReceiptFlow(imagePath, storeId, phone).catch(console.error);

