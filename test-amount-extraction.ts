/**
 * Test script for amount extraction
 * Tests the improved amount extraction logic
 */

import { extractTextFromBuffer, normalizeOCRText } from './lib/ocr';
import { parseReceiptText, extractTotalAmount } from './lib/receiptParser';
import fs from 'fs';

async function testAmountExtraction() {
  console.log('\n🔍 Testing Amount Extraction');
  console.log('='.repeat(60));
  
  const imagePath = process.argv[2] || 'uploads/receipts/unknown/1764012122802-bafb86a7.jpg';
  console.log(`Image: ${imagePath}`);
  
  if (!fs.existsSync(imagePath)) {
    console.error(`❌ Image not found: ${imagePath}`);
    process.exit(1);
  }
  
  const imageBuffer = fs.readFileSync(imagePath);
  console.log(`Size: ${Math.round(imageBuffer.length / 1024)} KB\n`);
  
  try {
    // Extract OCR text using PaddleOCR
    console.log('📸 Extracting text via OCR (PaddleOCR)...');
    const rawText = await extractTextFromBuffer(imageBuffer);
    const normalized = normalizeOCRText(rawText);
    
    console.log('\n=== OCR TEXT (showing lines with TOTAL/SUBTOTAL/TAX) ===');
    const lines = normalized.split('\n');
    lines.forEach((line, idx) => {
      const upperLine = line.toUpperCase();
      if (upperLine.includes('TOTAL') || upperLine.includes('SUBTOTAL') || upperLine.includes('TAX') || upperLine.includes('AMOUNT')) {
        console.log(`Line ${idx}: ${line}`);
      }
    });
    
    // Test amount extraction
    console.log('\n=== AMOUNT EXTRACTION TEST ===');
    const extractedAmount = extractTotalAmount(normalized);
    console.log(`Extracted Amount: ${extractedAmount || 'NOT FOUND'}`);
    
    // Test full parsing
    console.log('\n=== FULL PARSING RESULT ===');
    const parsed = parseReceiptText(normalized);
    console.log(`TIN: ${parsed.tin || '❌ Not found'}`);
    console.log(`Invoice: ${parsed.invoiceNo || '❌ Not found'}`);
    console.log(`Date: ${parsed.date || '❌ Not found'}`);
    console.log(`Amount: ${parsed.totalAmount || '❌ Not found'}`);
    console.log(`Branch: ${parsed.branchText || '❌ Not found'}`);
    console.log(`Confidence: ${parsed.confidence.toUpperCase()}`);
    
    if (parsed.totalAmount) {
      console.log(`\n✅ SUCCESS: Amount extracted: ${parsed.totalAmount}`);
    } else {
      console.log('\n❌ FAILED: Amount not extracted');
    }
    
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  }
}

testAmountExtraction();

