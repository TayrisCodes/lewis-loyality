/**
 * Realistic End-to-End Test: Receipt Upload → Rewards
 * 
 * Tests the complete flow:
 * 1. Upload receipt photo
 * 2. OCR extraction
 * 3. Receipt validation
 * 4. Visit recording
 * 5. Reward eligibility check
 * 
 * Uses phone number: 0936308836
 * 
 * Usage:
 *   npx tsx test-receipt-to-rewards.ts <receipt-image-path> [storeId]
 */

import fs from 'fs';
import FormData from 'form-data';
// Use native fetch if available (Node 18+), otherwise node-fetch
const fetch = globalThis.fetch || require('node-fetch');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const CUSTOMER_PHONE = '0936308836';

interface TestResult {
  success: boolean;
  status: 'approved' | 'rejected' | 'flagged';
  message: string;
  receiptId?: string;
  visitId?: string;
  visitCount?: number;
  rewardEarned?: boolean;
  rewardId?: string;
  rejectionDetails?: any[];
  reason?: string;
}

async function testReceiptUploadToRewards(imagePath: string, storeId?: string): Promise<TestResult> {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 REALISTIC END-TO-END TEST: Receipt Upload → Rewards');
  console.log('='.repeat(80));
  console.log(`📸 Receipt Image: ${imagePath}`);
  console.log(`📱 Customer Phone: ${CUSTOMER_PHONE}`);
  console.log(`🏪 Store ID: ${storeId || 'Will be identified from receipt TIN'}`);
  console.log(`🌐 API URL: ${API_URL}`);
  console.log('='.repeat(80) + '\n');

  // ============================================================
  // STEP 1: Check if image exists
  // ============================================================
  if (!fs.existsSync(imagePath)) {
    throw new Error(`❌ Image not found: ${imagePath}`);
  }

  const imageStats = fs.statSync(imagePath);
  console.log(`📊 Image size: ${Math.round(imageStats.size / 1024)} KB\n`);

  // ============================================================
  // STEP 2: Prepare form data for upload
  // ============================================================
  console.log('📤 Step 1: Preparing upload...');
  const formData = new FormData();
  
  formData.append('file', fs.createReadStream(imagePath), {
    filename: imagePath.split('/').pop() || 'receipt.jpg',
    contentType: 'image/jpeg',
  });
  
  formData.append('phone', CUSTOMER_PHONE);
  
  if (storeId) {
    formData.append('storeId', storeId);
    console.log(`   ✅ Store ID provided: ${storeId}`);
  } else {
    console.log(`   ℹ️  No Store ID - will be identified from receipt TIN`);
  }

  // ============================================================
  // STEP 3: Upload receipt to API
  // ============================================================
  console.log('\n📤 Step 2: Uploading receipt to API...');
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_URL}/api/receipts/upload`, {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders(),
    });

    const duration = Date.now() - startTime;
    console.log(`   ⏱️  Response received in ${Math.round(duration / 1000)}s`);
    console.log(`   📊 Status: ${response.status} ${response.statusText}\n`);

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    const responseText = await response.text();
    
    if (!contentType?.includes('application/json')) {
      console.error('❌ Server returned non-JSON response:');
      console.error('Content-Type:', contentType);
      console.error('Response (first 500 chars):', responseText.substring(0, 500));
      throw new Error(`Server returned HTML instead of JSON. Status: ${response.status}. Make sure the API server is running and the endpoint is correct.`);
    }

    let result: TestResult;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON response:');
      console.error('Response:', responseText.substring(0, 500));
      throw new Error(`Failed to parse response as JSON: ${parseError}`);
    }

    // ============================================================
    // STEP 4: Display Results
    // ============================================================
    console.log('='.repeat(80));
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
      
      console.log(`\n💬 Message: ${result.message || 'Receipt approved and visit recorded'}`);
      
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
      if ((result as any).canRequestReview) {
        console.log(`\nYou can request a manual review if needed.`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`⏱️  Total processing time: ${Math.round(duration / 1000)}s`);
    console.log('='.repeat(80) + '\n');

    return result;

  } catch (error: any) {
    console.error('\n❌ ERROR during upload:');
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
    console.error('❌ Usage: npx tsx test-receipt-to-rewards.ts <receipt-image-path> [storeId]');
    console.error('\nExample:');
    console.error('  npx tsx test-receipt-to-rewards.ts uploads/receipts/unknown/photo_2025-11-26_11-44-49.jpg');
    console.error('  npx tsx test-receipt-to-rewards.ts uploads/receipts/unknown/photo_2025-11-26_11-44-49.jpg 65abc123def456');
    process.exit(1);
  }

  try {
    const result = await testReceiptUploadToRewards(imagePath, storeId);
    
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

export { testReceiptUploadToRewards };

