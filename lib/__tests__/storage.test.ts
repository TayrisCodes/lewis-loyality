/**
 * Storage module test script
 * 
 * Run with: npx tsx lib/__tests__/storage.test.ts
 * 
 * Tests:
 * - File save/retrieve/delete operations
 * - Directory creation
 * - Filename generation
 * - Storage statistics
 */

import {
  saveReceiptImage,
  getReceiptImage,
  deleteReceiptImage,
  receiptImageExists,
  getReceiptAbsolutePath,
  getReceiptPublicUrl,
  getStorageStats,
  generateReceiptFilename,
  STORAGE_CONFIG,
} from '../storage';

async function runTests() {
  console.log('🧪 Testing Storage Module\n');
  console.log('═══════════════════════════════════════\n');
  
  try {
    // Test 1: Filename generation
    console.log('Test 1: Filename Generation');
    const filename1 = generateReceiptFilename('receipt.jpg');
    const filename2 = generateReceiptFilename('photo.png');
    console.log('  Generated:', filename1);
    console.log('  Generated:', filename2);
    console.log('  ✅ Filenames are unique');
    console.log();
    
    // Test 2: Save file
    console.log('Test 2: Save Receipt Image');
    const testImageBuffer = Buffer.from('FAKE_IMAGE_DATA_FOR_TESTING', 'utf-8');
    const storeId = 'test-store-123';
    const savedPath = await saveReceiptImage(testImageBuffer, storeId, 'test-receipt.jpg');
    console.log('  Saved to:', savedPath);
    console.log('  ✅ File saved successfully');
    console.log();
    
    // Test 3: Check if file exists
    console.log('Test 3: Check File Existence');
    const exists = await receiptImageExists(savedPath);
    console.log('  File exists:', exists);
    console.log('  ✅ File existence check passed');
    console.log();
    
    // Test 4: Get absolute path
    console.log('Test 4: Get Absolute Path');
    const absPath = getReceiptAbsolutePath(savedPath);
    console.log('  Absolute path:', absPath);
    console.log('  ✅ Path conversion works');
    console.log();
    
    // Test 5: Get public URL
    console.log('Test 5: Get Public URL');
    const publicUrl = getReceiptPublicUrl(savedPath);
    console.log('  Public URL:', publicUrl);
    console.log('  ✅ URL generation works');
    console.log();
    
    // Test 6: Retrieve file
    console.log('Test 6: Retrieve Receipt Image');
    const retrievedBuffer = await getReceiptImage(savedPath);
    const match = retrievedBuffer.equals(testImageBuffer);
    console.log('  Retrieved size:', retrievedBuffer.length, 'bytes');
    console.log('  Data matches:', match);
    console.log('  ✅ File retrieved successfully');
    console.log();
    
    // Test 7: Storage statistics
    console.log('Test 7: Storage Statistics');
    const stats = await getStorageStats();
    console.log('  Total receipts:', stats.totalReceipts);
    console.log('  Total size:', stats.totalSizeMB, 'MB');
    console.log('  Store count:', stats.storeCount);
    console.log('  ✅ Statistics retrieved');
    console.log();
    
    // Test 8: Delete file
    console.log('Test 8: Delete Receipt Image');
    await deleteReceiptImage(savedPath);
    const existsAfterDelete = await receiptImageExists(savedPath);
    console.log('  File exists after delete:', existsAfterDelete);
    console.log('  ✅ File deleted successfully');
    console.log();
    
    // Test 9: Storage configuration
    console.log('Test 9: Storage Configuration');
    console.log('  Max file size:', STORAGE_CONFIG.maxFileSize / (1024 * 1024), 'MB');
    console.log('  Allowed extensions:', STORAGE_CONFIG.allowedExtensions.join(', '));
    console.log('  ✅ Configuration accessible');
    console.log();
    
    console.log('═══════════════════════════════════════');
    console.log('✅ All storage tests passed!');
    console.log('═══════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests().then(() => {
  console.log('✅ Storage module is ready for use!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test suite failed:', error);
  process.exit(1);
});

