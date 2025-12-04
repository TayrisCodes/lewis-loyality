/**
 * Direct End-to-End Test: Receipt Upload → Rewards
 * 
 * Tests the complete flow by calling validation function directly
 * (bypasses HTTP - more reliable for testing)
 * 
 * Uses phone number: 0936308836
 * 
 * Usage:
 *   npx tsx test-receipt-direct.ts <receipt-image-path> [storeId]
 */

// Load environment variables FIRST (before any imports that need them)
import * as fs from 'fs';
import * as path from 'path';

// Load .env.production file directly
const envFiles = ['.env.production', '.env.local', '.env'];
for (const envFile of envFiles) {
  const envPath = path.join(process.cwd(), envFile);
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    }
    break; // Use first found file
  }
}

// Verify MONGODB_URI is loaded
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  console.error('Checked files:', envFiles.join(', '));
  process.exit(1);
}

import { validateAndProcessReceipt } from './lib/receiptValidator';

const CUSTOMER_PHONE = '0936308836';

async function testReceiptDirect(imagePath: string, storeId?: string) {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 REALISTIC END-TO-END TEST: Receipt Upload → Rewards');
  console.log('='.repeat(80));
  console.log(`📸 Receipt Image: ${imagePath}`);
  console.log(`📱 Customer Phone: ${CUSTOMER_PHONE}`);
  console.log(`🏪 Store ID: ${storeId || 'Will be identified from receipt TIN'}`);
  console.log('='.repeat(80) + '\n');

  // ============================================================
  // STEP 1: Check if image exists
  // ============================================================
  if (!fs.existsSync(imagePath)) {
    throw new Error(`❌ Image not found: ${imagePath}`);
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const imageStats = fs.statSync(imagePath);
  console.log(`📊 Image size: ${Math.round(imageStats.size / 1024)} KB\n`);

  // ============================================================
  // STEP 2: Call validation function directly
  // ============================================================
  console.log('📤 Step 1: Processing receipt...\n');
  const startTime = Date.now();
  
  try {
    const result = await validateAndProcessReceipt({
      imageBuffer,
      originalFilename: imagePath.split('/').pop() || 'receipt.jpg',
      storeId: storeId,
      customerPhone: CUSTOMER_PHONE,
    });

    const duration = Date.now() - startTime;

    // ============================================================
    // STEP 3: Display Results
    // ============================================================
    console.log('\n' + '='.repeat(80));
    console.log('📋 TEST RESULTS');
    console.log('='.repeat(80));

    if (result.success && result.status === 'approved') {
      console.log('\n✅ RECEIPT APPROVED!');
      console.log('='.repeat(80));
      console.log(`📄 Receipt ID: ${result.receiptId}`);
      console.log(`📍 Visit ID: ${result.visitId || 'N/A'}`);
      console.log(`🔢 Total Visits: ${result.visitCount || 0}`);
      
      if (result.rewardEarned) {
        console.log('\n🎉🎉🎉 REWARD EARNED! 🎉🎉🎉');
        console.log('='.repeat(80));
        console.log(`🎁 Reward ID: ${result.rewardId}`);
        console.log(`📱 Customer: ${CUSTOMER_PHONE}`);
        console.log(`✅ Visit Count: ${result.visitCount} (qualifies for reward)`);
        console.log('='.repeat(80));
      } else {
        console.log('\n✅ Visit recorded successfully');
        console.log(`📊 Progress: ${result.visitCount} visit(s) recorded`);
      }
      
      console.log(`\n💬 Message: ${result.reason || 'Receipt approved and visit recorded'}`);
      
    } else if (result.status === 'rejected') {
      console.log('\n❌ RECEIPT REJECTED');
      console.log('='.repeat(80));
      console.log(`📄 Receipt ID: ${result.receiptId || 'N/A'}`);
      console.log(`\n💬 Main Reason: ${result.reason || 'Receipt rejected'}`);
      
      if (result.rejectionDetails && result.rejectionDetails.length > 0) {
        console.log('\n📋 DETAILED REJECTION REASONS:');
        console.log('='.repeat(80));
        result.rejectionDetails.forEach((detail: any, index: number) => {
          console.log(`\n${index + 1}. Field: ${detail.field || 'N/A'}`);
          console.log(`   Issue: ${detail.issue || 'N/A'}`);
          if (detail.found !== undefined) {
            console.log(`   Found: ${detail.found}`);
          }
          if (detail.expected !== undefined) {
            console.log(`   Expected: ${detail.expected}`);
          }
          console.log(`   Message: ${detail.message || 'N/A'}`);
        });
      }
      
      console.log('\n' + '='.repeat(80));
      console.log('❌ VISIT POINT NOT RECEIVED');
      console.log('='.repeat(80));
      console.log(`\nReason: ${result.reason}`);
      
      if (result.rejectionDetails && result.rejectionDetails.length > 0) {
        console.log('\nDetailed explanation:');
        result.rejectionDetails.forEach((detail: any) => {
          console.log(`  • ${detail.message}`);
        });
      }
      
    } else if (result.status === 'flagged') {
      console.log('\n⚠️  RECEIPT FLAGGED FOR MANUAL REVIEW');
      console.log('='.repeat(80));
      console.log(`📄 Receipt ID: ${result.receiptId || 'N/A'}`);
      console.log(`\n💬 Reason: ${result.reason || 'Receipt needs manual review'}`);
      
      if (result.rejectionDetails && result.rejectionDetails.length > 0) {
        console.log('\n📋 DETAILED REVIEW REASONS:');
        console.log('='.repeat(80));
        result.rejectionDetails.forEach((detail: any, index: number) => {
          console.log(`\n${index + 1}. Field: ${detail.field || 'N/A'}`);
          console.log(`   Issue: ${detail.issue || 'N/A'}`);
          if (detail.found !== undefined) {
            console.log(`   Found: ${detail.found}`);
          }
          if (detail.expected !== undefined) {
            console.log(`   Expected: ${detail.expected}`);
          }
          console.log(`   Message: ${detail.message || 'N/A'}`);
        });
      }
      
      console.log('\n' + '='.repeat(80));
      console.log('⏳ VISIT POINT PENDING REVIEW');
      console.log('='.repeat(80));
      console.log(`\nYour receipt has been submitted but needs admin review.`);
      console.log(`An admin will verify the receipt and approve/reject it.`);
      console.log(`Receipt ID: ${result.receiptId}`);
    }

    // Display parsed receipt data
    if (result.parsed) {
      console.log('\n' + '='.repeat(80));
      console.log('📋 EXTRACTED RECEIPT DATA');
      console.log('='.repeat(80));
      console.log(`TIN: ${result.parsed.tin || '❌ Not found'}`);
      console.log(`Invoice: ${result.parsed.invoiceNo || '❌ Not found'}`);
      console.log(`Date: ${result.parsed.date || '❌ Not found'}`);
      console.log(`Amount: ${result.parsed.totalAmount || '❌ Not found'} ETB`);
      console.log(`Branch: ${result.parsed.branchText || '❌ Not found'}`);
      console.log(`Confidence: ${result.parsed.confidence.toUpperCase()}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log(`⏱️  Total processing time: ${Math.round(duration / 1000)}s`);
    console.log('='.repeat(80) + '\n');

    return result;

  } catch (error: any) {
    console.error('\n❌ ERROR during processing:');
    console.error('='.repeat(80));
    console.error(`Error: ${error.message}`);
    if (error.stack) {
      console.error(`\nStack trace:\n${error.stack}`);
    }
    console.error('='.repeat(80) + '\n');
    
    throw error;
  }
}

// ============================================================
// Main execution
// ============================================================
async function main() {
  const imagePath = process.argv[2];
  const storeId = process.argv[3];

  if (!imagePath) {
    console.error('❌ Usage: npx tsx test-receipt-direct.ts <receipt-image-path> [storeId]');
    console.error('\nExample:');
    console.error('  npx tsx test-receipt-direct.ts uploads/receipts/unknown/photo_2025-11-26_11-44-49.jpg');
    console.error('  npx tsx test-receipt-direct.ts uploads/receipts/unknown/photo_2025-11-26_11-44-49.jpg 65abc123def456');
    process.exit(1);
  }

  try {
    const result = await testReceiptDirect(imagePath, storeId);
    
    // Exit with appropriate code
    if (result.success && result.status === 'approved') {
      process.exit(0); // Success
    } else {
      process.exit(1); // Rejected or flagged
    }
  } catch (error: any) {
    console.error(`\n❌ Test failed: ${error.message}`);
    process.exit(1);
  }
}

// Run test
if (require.main === module) {
  main();
}

export { testReceiptDirect };

