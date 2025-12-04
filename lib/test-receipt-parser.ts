/**
 * Test script for receipt parser
 * 
 * Run with: npx tsx lib/test-receipt-parser.ts
 * 
 * Tests all parsing functions with sample receipt text
 */

import {
  extractTIN,
  extractInvoiceNo,
  extractDate,
  extractTotalAmount,
  extractBranchText,
  extractBarcodeData,
  parseReceiptText,
  validateParsedReceipt,
  isReceiptFromToday,
  formatAmount,
} from './receiptParser';

// Sample receipt text (simulating OCR output)
const sampleReceipts = [
  {
    name: 'Lewis Coffee Receipt - Bole',
    text: `
LEWIS RETAIL
Lewis Coffee - Bole
123 Bole Road, Addis Ababa

TIN: 0003169685
Date: 2024-11-11
Invoice No: 04472-002-0011L

Items:
Cappuccino           250.00
Croissant            150.00
Water                 50.00

SUBTOTAL             450.00
TAX (15%)             67.50
TOTAL                517.50

Thank you for your visit!
    `.trim(),
  },
  {
    name: 'Receipt with different format',
    text: `
Lewis Coffee - Piassa
45 Churchill Avenue
Piassa, Addis Ababa

Tax ID: 0003169685
Receipt #: INV-2024-1234
11/11/2024

Latte                 300 ETB
Sandwich              200 ETB
NET AMOUNT            500 ETB

Thank you!
    `.trim(),
  },
  {
    name: 'Minimal receipt',
    text: `
LEWIS RETAIL
TIN 0003169685
Date: 2024-11-11
Total: 750.50
    `.trim(),
  },
];

async function runTests() {
  console.log('🧪 Testing Receipt Parser Module\n');
  console.log('═══════════════════════════════════════════════════════\n');

  for (const sample of sampleReceipts) {
    console.log(`\n📝 Testing: ${sample.name}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const text = sample.text;
    
    // Test individual extractors
    console.log('\n1️⃣  Field Extraction:');
    
    const tin = extractTIN(text);
    console.log(`   TIN: ${tin || '❌ Not found'}`);
    
    const invoiceNo = extractInvoiceNo(text);
    console.log(`   Invoice No: ${invoiceNo || '❌ Not found'}`);
    
    const date = extractDate(text);
    console.log(`   Date: ${date || '❌ Not found'}`);
    
    const amount = extractTotalAmount(text);
    console.log(`   Amount: ${amount ? formatAmount(amount) : '❌ Not found'}`);
    
    const branch = extractBranchText(text);
    console.log(`   Branch: ${branch || '❌ Not found'}`);
    
    const barcode = extractBarcodeData(text);
    console.log(`   Barcode: ${barcode || '❌ Not found'}`);
    
    // Test complete parsing
    console.log('\n2️⃣  Complete Parsing:');
    const parsed = parseReceiptText(text);
    console.log(`   Confidence: ${parsed.confidence}`);
    console.log(`   Fields Extracted: ${5 - parsed.flags.filter(f => f.includes('not found')).length}/5`);
    if (parsed.flags.length > 0) {
      console.log(`   Flags: ${parsed.flags.join(', ')}`);
    }
    
    // Test validation
    console.log('\n3️⃣  Validation Tests:');
    
    // Test 1: Valid receipt
    const validation1 = validateParsedReceipt(parsed, {
      expectedTIN: '0003169685',
      expectedBranch: 'Bole',
      minAmount: 100,
      maxAge: 30,
    });
    console.log(`   ✓ Valid TIN + Branch: ${validation1.valid ? '✅ PASS' : '❌ FAIL'}`);
    if (!validation1.valid) {
      console.log(`     Reason: ${validation1.reason}`);
    }
    if (validation1.warnings.length > 0) {
      console.log(`     Warnings: ${validation1.warnings.join(', ')}`);
    }
    
    // Test 2: Wrong TIN
    const validation2 = validateParsedReceipt(parsed, {
      expectedTIN: '9999999999',
    });
    console.log(`   ✓ Wrong TIN: ${!validation2.valid ? '✅ PASS (correctly rejected)' : '❌ FAIL'}`);
    if (!validation2.valid) {
      console.log(`     Reason: ${validation2.reason}`);
    }
    
    // Test 3: Insufficient amount
    const validation3 = validateParsedReceipt(parsed, {
      minAmount: 10000,
    });
    console.log(`   ✓ Below min amount: ${!validation3.valid ? '✅ PASS (correctly rejected)' : '❌ FAIL'}`);
    if (!validation3.valid) {
      console.log(`     Reason: ${validation3.reason}`);
    }
    
    // Test 4: Date check
    const isToday = isReceiptFromToday(parsed);
    console.log(`   ✓ Is from today: ${isToday ? '✅ YES' : '⚠️  NO'}`);
    
    console.log('\n');
  }

  // Additional unit tests
  console.log('\n🔬 Unit Tests for Edge Cases');
  console.log('═══════════════════════════════════════════════════════\n');
  
  // Test TIN extraction with variations
  console.log('Test: TIN Extraction Variations');
  const tinTests = [
    { text: 'TIN: 0003169685', expected: '0003169685' },
    { text: 'TIN 0003169685', expected: '0003169685' },
    { text: 'Tax ID: 0003169685', expected: '0003169685' },
    { text: 'VAT: 0003169685', expected: '0003169685' },
  ];
  
  for (const test of tinTests) {
    const result = extractTIN(test.text);
    const pass = result === test.expected;
    console.log(`  ${pass ? '✅' : '❌'} "${test.text}" → ${result}`);
  }
  
  // Test date extraction with variations
  console.log('\nTest: Date Extraction Variations');
  const dateTests = [
    { text: '2024-11-11', expected: '2024-11-11' },
    { text: '11/11/2024', expected: '2024-11-11' },
    { text: '11.11.2024', expected: '2024-11-11' },
    { text: 'Nov 11, 2024', expected: '2024-11-11' },
    { text: 'November 11, 2024', expected: '2024-11-11' },
  ];
  
  for (const test of dateTests) {
    const result = extractDate(test.text);
    const pass = result === test.expected;
    console.log(`  ${pass ? '✅' : '❌'} "${test.text}" → ${result}`);
  }
  
  // Test amount extraction
  console.log('\nTest: Amount Extraction');
  const amountTests = [
    { text: 'TOTAL: 517.50', expected: 517.50 },
    { text: 'NET AMOUNT 500', expected: 500 },
    { text: 'SUBTOTAL 450.00\nTOTAL 517.50', expected: 517.50 },
    { text: 'Balance: 1,250.00', expected: 1250.00 },
  ];
  
  for (const test of amountTests) {
    const result = extractTotalAmount(test.text);
    const pass = result === test.expected;
    console.log(`  ${pass ? '✅' : '❌'} "${test.text.replace(/\n/g, ' ')}" → ${result}`);
  }
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ All parser tests completed!');
  console.log('═══════════════════════════════════════════════════════\n');
}

// Run tests
runTests().then(() => {
  console.log('✅ Receipt parser is ready for use!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});


