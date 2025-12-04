import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/**
 * Storage abstraction layer for receipt images
 * 
 * Current implementation: Local filesystem
 * Future: Easy migration to S3/Cloud Storage by swapping this module
 * 
 * Design principles:
 * - Simple interface (save, get, delete)
 * - Organized by storeId
 * - Unique filenames with timestamps
 * - Ready for cloud migration
 */

const UPLOAD_BASE_DIR = path.join(process.cwd(), 'uploads', 'receipts');

/**
 * Generate a unique filename for receipt image
 * Format: {timestamp}-{hash}.{extension}
 * Example: 1731345678901-a3f5c2d8.jpg
 */
export function generateReceiptFilename(originalName: string): string {
  const timestamp = Date.now();
  const hash = crypto.randomBytes(4).toString('hex');
  const ext = path.extname(originalName).toLowerCase() || '.jpg';
  return `${timestamp}-${hash}${ext}`;
}

/**
 * Get the storage path for a store's receipts
 * Creates directory if it doesn't exist
 */
async function getStoreDirectory(storeId: string): Promise<string> {
  // Ensure base directory exists first
  try {
    await fs.access(UPLOAD_BASE_DIR);
  } catch {
    // Base directory doesn't exist, create it
    await fs.mkdir(UPLOAD_BASE_DIR, { recursive: true, mode: 0o775 });
  }
  
  const storePath = path.join(UPLOAD_BASE_DIR, storeId);
  
  try {
    await fs.access(storePath);
  } catch {
    // Directory doesn't exist, create it with write permissions
    await fs.mkdir(storePath, { recursive: true, mode: 0o775 });
  }
  
  return storePath;
}

/**
 * Save receipt image to local storage
 * 
 * @param file - Buffer containing image data
 * @param storeId - Store ID for organization
 * @param originalName - Original filename (for extension)
 * @returns Relative path to saved file (e.g., "receipts/{storeId}/{filename}")
 * 
 * Future migration to S3:
 * - Change this to upload to S3
 * - Return S3 URL instead of local path
 * - Keep same function signature
 */
export async function saveReceiptImage(
  file: Buffer,
  storeId: string,
  originalName: string
): Promise<string> {
  try {
    // Get or create store directory
    const storeDir = await getStoreDirectory(storeId);
    
    // Generate unique filename
    const filename = generateReceiptFilename(originalName);
    const fullPath = path.join(storeDir, filename);
    
    // Save file
    await fs.writeFile(fullPath, file);
    
    // Return relative path (used in database)
    const relativePath = path.join('receipts', storeId, filename);
    
    console.log(`✅ Receipt saved: ${relativePath}`);
    return relativePath;
    
  } catch (error) {
    console.error('❌ Error saving receipt:', error);
    throw new Error(`Failed to save receipt image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get receipt image from local storage
 * 
 * @param relativePath - Path returned from saveReceiptImage
 * @returns Buffer containing image data
 * 
 * Future migration to S3:
 * - Fetch from S3 URL
 * - Return buffer or signed URL
 */
export async function getReceiptImage(relativePath: string): Promise<Buffer> {
  try {
    const fullPath = path.join(UPLOAD_BASE_DIR, '..', relativePath);
    const imageBuffer = await fs.readFile(fullPath);
    
    console.log(`✅ Receipt retrieved: ${relativePath}`);
    return imageBuffer;
    
  } catch (error) {
    console.error('❌ Error retrieving receipt:', error);
    throw new Error(`Failed to retrieve receipt image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete receipt image from local storage
 * 
 * @param relativePath - Path returned from saveReceiptImage
 * 
 * Future migration to S3:
 * - Delete from S3
 * - Handle S3 deletion errors
 */
export async function deleteReceiptImage(relativePath: string): Promise<void> {
  try {
    const fullPath = path.join(UPLOAD_BASE_DIR, '..', relativePath);
    await fs.unlink(fullPath);
    
    console.log(`✅ Receipt deleted: ${relativePath}`);
    
  } catch (error) {
    console.error('❌ Error deleting receipt:', error);
    // Don't throw - file might already be deleted
    console.warn(`Warning: Could not delete receipt ${relativePath}`);
  }
}

/**
 * Check if receipt image exists
 * 
 * @param relativePath - Path returned from saveReceiptImage
 * @returns true if file exists
 */
export async function receiptImageExists(relativePath: string): Promise<boolean> {
  try {
    const fullPath = path.join(UPLOAD_BASE_DIR, '..', relativePath);
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get absolute path for receipt image (for server-side processing)
 * 
 * @param relativePath - Path returned from saveReceiptImage
 * @returns Absolute filesystem path
 */
export function getReceiptAbsolutePath(relativePath: string): string {
  return path.join(UPLOAD_BASE_DIR, '..', relativePath);
}

/**
 * Get public URL for receipt image (for serving to frontend)
 * 
 * @param relativePath - Path returned from saveReceiptImage
 * @returns URL path (e.g., "/api/receipts/image/{storeId}/{filename}")
 */
export function getReceiptPublicUrl(relativePath: string): string {
  // Extract storeId and filename from path
  const parts = relativePath.split(path.sep);
  const storeId = parts[parts.length - 2];
  const filename = parts[parts.length - 1];
  
  return `/api/receipts/image/${storeId}/${filename}`;
}

/**
 * Clean up old receipt images (optional maintenance function)
 * 
 * @param daysOld - Delete receipts older than this many days
 * @returns Number of files deleted
 */
export async function cleanupOldReceipts(daysOld: number = 90): Promise<number> {
  let deletedCount = 0;
  const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
  
  try {
    // Get all store directories
    const storeIds = await fs.readdir(UPLOAD_BASE_DIR);
    
    for (const storeId of storeIds) {
      const storeDir = path.join(UPLOAD_BASE_DIR, storeId);
      const stat = await fs.stat(storeDir);
      
      if (!stat.isDirectory()) continue;
      
      // Get all files in store directory
      const files = await fs.readdir(storeDir);
      
      for (const file of files) {
        const filePath = path.join(storeDir, file);
        const fileStat = await fs.stat(filePath);
        
        // Check if file is older than cutoff
        if (fileStat.mtimeMs < cutoffTime) {
          await fs.unlink(filePath);
          deletedCount++;
          console.log(`🗑️ Deleted old receipt: ${file}`);
        }
      }
    }
    
    console.log(`✅ Cleanup complete: ${deletedCount} old receipts deleted`);
    return deletedCount;
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    return deletedCount;
  }
}

/**
 * Get storage statistics
 * 
 * @returns Object with storage info
 */
export async function getStorageStats(): Promise<{
  totalReceipts: number;
  totalSizeBytes: number;
  totalSizeMB: number;
  storeCount: number;
}> {
  let totalReceipts = 0;
  let totalSizeBytes = 0;
  let storeCount = 0;
  
  try {
    const storeIds = await fs.readdir(UPLOAD_BASE_DIR);
    
    for (const storeId of storeIds) {
      const storeDir = path.join(UPLOAD_BASE_DIR, storeId);
      const stat = await fs.stat(storeDir);
      
      if (!stat.isDirectory()) continue;
      
      storeCount++;
      const files = await fs.readdir(storeDir);
      
      for (const file of files) {
        const filePath = path.join(storeDir, file);
        const fileStat = await fs.stat(filePath);
        
        if (fileStat.isFile()) {
          totalReceipts++;
          totalSizeBytes += fileStat.size;
        }
      }
    }
    
    return {
      totalReceipts,
      totalSizeBytes,
      totalSizeMB: Math.round(totalSizeBytes / (1024 * 1024) * 100) / 100,
      storeCount,
    };
    
  } catch (error) {
    console.error('❌ Error getting storage stats:', error);
    return {
      totalReceipts: 0,
      totalSizeBytes: 0,
      totalSizeMB: 0,
      storeCount: 0,
    };
  }
}

// Export storage configuration for reference
export const STORAGE_CONFIG = {
  baseDir: UPLOAD_BASE_DIR,
  maxFileSize: 8 * 1024 * 1024, // 8MB
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.heic'],
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/heic', 'image/heif'],
} as const;


