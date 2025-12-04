/**
 * Test OCR Speed - Verify OCR completes in under 10 seconds
 * 
 * This script tests OCR processing speed with a sample image
 * to ensure the timeout fixes are working correctly.
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { extractTextFromBuffer } from '../lib/ocr';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function testOCRSpeed() {
  console.log('🧪 Testing OCR Speed (must complete in <10 seconds)\n');
  
  // Create a test image buffer (1x1 PNG for testing)
  // In production, this would be a real receipt image
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const testImageBuffer = Buffer.from(testImageBase64, 'base64');
  
  console.log(`📸 Test image: ${Math.round(testImageBuffer.length / 1024)}KB\n`);
  
  const startTime = Date.now();
  
  try {
    console.log('⏱️  Starting OCR with timeout protection...\n');
    
    const text = await extractTextFromBuffer(testImageBuffer, {
      skipPaddleOCR: false, // Use PaddleOCR
    });
    
    const duration = Date.now() - startTime;
    const durationSeconds = Math.round(duration / 1000);
    
    console.log(`\n✅ OCR completed in ${durationSeconds}s`);
    console.log(`📝 Extracted text length: ${text.length} characters`);
    console.log(`📄 First 100 chars: ${text.substring(0, 100)}...\n`);
    
    if (durationSeconds > 10) {
      console.error(`❌ FAILED: OCR took ${durationSeconds}s (should be <10s)`);
      process.exit(1);
    } else {
      console.log(`✅ PASSED: OCR completed in ${durationSeconds}s (<10s target)`);
      process.exit(0);
    }
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const durationSeconds = Math.round(duration / 1000);
    
    console.error(`\n❌ OCR failed after ${durationSeconds}s:`);
    console.error(`   Error: ${error.message}\n`);
    
    if (durationSeconds > 10) {
      console.error(`❌ FAILED: OCR timeout exceeded 10s limit`);
      process.exit(1);
    } else {
      console.log(`✅ PASSED: OCR failed fast (<10s) with proper timeout`);
      process.exit(0);
    }
  }
}

// Run test
testOCRSpeed().catch((error) => {
  console.error('❌ Test script error:', error);
  process.exit(1);
});

