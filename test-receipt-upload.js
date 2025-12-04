/**
 * Terminal-based test for receipt upload system
 * 
 * This simulates a receipt upload without needing a browser
 * Tests the complete flow: upload → OCR → validation → response
 * 
 * Run with: node test-receipt-upload.js
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Create a sample receipt image (text-based for testing)
async function createTestReceipt() {
  const { createCanvas } = require('canvas');
  
  const canvas = createCanvas(800, 1200);
  const ctx = canvas.getContext('2d');
  
  // White background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, 800, 1200);
  
  // Black text
  ctx.fillStyle = 'black';
  ctx.font = 'bold 40px Arial';
  
  // Receipt content
  const today = new Date().toISOString().split('T')[0];
  const receiptText = [
    '',
    'LEWIS RETAIL',
    'Lewis Coffee - Bole',
    '123 Bole Road, Addis Ababa',
    '',
    `TIN: 0003169685`,
    `Date: ${today}`,
    `Invoice No: TEST-${Date.now()}`,
    '',
    'Items:',
    'Cappuccino           250.00',
    'Croissant            150.00',
    'Water                 50.00',
    '',
    'SUBTOTAL             450.00',
    'TAX (15%)             67.50',
    'TOTAL                517.50',
    '',
    'Thank you!',
  ];
  
  let y = 100;
  receiptText.forEach(line => {
    ctx.fillText(line, 50, y);
    y += 50;
  });
  
  // Save to file
  const buffer = canvas.toBuffer('image/jpeg');
  const filepath = path.join(__dirname, 'test-receipt.jpg');
  fs.writeFileSync(filepath, buffer);
  
  console.log('✅ Created test receipt:', filepath);
  return filepath;
}

// Test the upload
async function testReceiptUpload() {
  console.log('\n🧪 Testing Receipt Upload System');
  console.log('═══════════════════════════════════════════════════════\n');
  
  try {
    // Step 1: Get store ID from database
    console.log('📋 Step 1: Fetching store information...');
    
    const storeResponse = await fetch('http://localhost:3000/api/store');
    const storeData = await storeResponse.json();
    
    if (!storeData.stores || storeData.stores.length === 0) {
      console.error('❌ No stores found. Please run seed script first.');
      process.exit(1);
    }
    
    const store = storeData.stores[0];
    console.log(`   ✅ Store: ${store.name}`);
    console.log(`   ✅ Store ID: ${store._id}`);
    
    // Step 2: Create test receipt image
    console.log('\n📸 Step 2: Creating test receipt image...');
    const receiptPath = await createTestReceipt();
    
    // Step 3: Upload receipt
    console.log('\n📤 Step 3: Uploading receipt to API...');
    console.log(`   URL: http://localhost:3000/api/receipts/upload`);
    console.log(`   Store: ${store._id}`);
    console.log(`   Phone: +251911234567`);
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(receiptPath));
    formData.append('storeId', store._id);
    formData.append('phone', '+251911234567');
    
    const uploadStart = Date.now();
    const uploadResponse = await fetch('http://localhost:3000/api/receipts/upload', {
      method: 'POST',
      body: formData,
    });
    const uploadDuration = Date.now() - uploadStart;
    
    const result = await uploadResponse.json();
    
    console.log(`\n📊 Upload completed in ${uploadDuration}ms`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Step 4: Display results
    console.log('📋 RESULT:');
    console.log('─────────────────────────────────────────────────────');
    
    if (result.success && result.status === 'approved') {
      console.log('✅ Status: APPROVED');
      console.log(`   Message: ${result.message}`);
      console.log(`   Receipt ID: ${result.data.receiptId}`);
      console.log(`   Visit ID: ${result.data.visitId}`);
      console.log(`   Visit Count: ${result.data.visitCount}`);
      console.log(`   Reward Earned: ${result.data.rewardEarned ? '🎁 YES!' : 'Not yet'}`);
      
      if (result.data.rewardEarned) {
        console.log(`   Reward ID: ${result.data.rewardId}`);
      }
    } else if (result.status === 'rejected') {
      console.log('❌ Status: REJECTED');
      console.log(`   Reason: ${result.reason}`);
      console.log(`   Receipt ID: ${result.receiptId}`);
      console.log(`   Can Retake: ${result.canRetake}`);
      console.log(`   Can Request Review: ${result.canRequestReview}`);
    } else if (result.status === 'flagged') {
      console.log('⚠️  Status: FLAGGED');
      console.log(`   Reason: ${result.reason}`);
      console.log(`   Receipt ID: ${result.receiptId}`);
      console.log(`   Can Retake: ${result.canRetake}`);
      console.log(`   Can Request Review: ${result.canRequestReview}`);
    } else {
      console.log('❌ Status: ERROR');
      console.log(`   Error: ${result.error}`);
    }
    
    console.log('─────────────────────────────────────────────────────\n');
    
    // Step 5: Check receipt status
    if (result.receiptId || result.data?.receiptId) {
      const receiptId = result.receiptId || result.data?.receiptId;
      
      console.log('📋 Step 5: Checking receipt status...');
      console.log(`   Receipt ID: ${receiptId}`);
      
      const statusResponse = await fetch(`http://localhost:3000/api/receipts/status/${receiptId}`);
      const statusData = await statusResponse.json();
      
      console.log('\n📊 Status Check Result:');
      console.log(`   Status: ${statusData.status}`);
      console.log(`   Visit Counted: ${statusData.visitCounted ? '✅ Yes' : '❌ No'}`);
      console.log(`   Parsed TIN: ${statusData.parsedData?.tin || 'N/A'}`);
      console.log(`   Parsed Invoice: ${statusData.parsedData?.invoiceNo || 'N/A'}`);
      console.log(`   Parsed Date: ${statusData.parsedData?.date || 'N/A'}`);
      console.log(`   Parsed Amount: ${statusData.parsedData?.amount || 'N/A'} ETB`);
    }
    
    // Cleanup
    console.log('\n🧹 Cleanup...');
    if (fs.existsSync(receiptPath)) {
      fs.unlinkSync(receiptPath);
      console.log('   ✅ Removed test receipt image');
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Test Complete!');
    console.log('═══════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/api/store');
    return response.ok;
  } catch {
    return false;
  }
}

// Main
async function main() {
  console.log('🚀 Starting Receipt Upload Test...\n');
  
  // Check if server is running
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.error('❌ Server not running on http://localhost:3000');
    console.error('\nPlease start the server first:');
    console.error('  npm run dev');
    console.error('\nThen run this test again.');
    process.exit(1);
  }
  
  console.log('✅ Server is running\n');
  
  // Check if canvas is installed
  try {
    require('canvas');
  } catch {
    console.error('❌ Canvas package not installed');
    console.error('\nPlease install it first:');
    console.error('  npm install canvas');
    process.exit(1);
  }
  
  await testReceiptUpload();
}

main();

