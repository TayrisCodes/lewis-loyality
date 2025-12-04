/**
 * Fraud Detection Engine
 * 
 * Comprehensive fraud detection for receipt images including:
 * - pHash duplicate detection (perceptual hashing)
 * - Image tampering detection (compression anomalies, metadata mismatches)
 * - AI-generated image detection (signature patterns)
 * - Combined fraud scoring
 * 
 * Usage:
 * ```typescript
 * const fraudScore = await calculateFraudScore({
 *   imageBuffer: buffer,
 *   invoiceNo: 'INV123',
 *   barcodeData: '123456',
 * });
 * ```
 */

import sharp from 'sharp';
import crypto from 'crypto';
import dbConnect from './db';
import Receipt from '@/models/Receipt';

/**
 * Tampering detection result
 */
export interface TamperingResult {
  score: number; // 0-100 (higher = more suspicious)
  indicators: string[];
  details: {
    compressionAnomalies?: boolean;
    metadataMismatches?: boolean;
    resolutionManipulation?: boolean;
    lightingInconsistencies?: boolean;
  };
}

/**
 * AI detection result
 */
export interface AIDetectionResult {
  probability: number; // 0-100 (higher = more likely AI-generated)
  indicators: string[];
  details: {
    metadataSignatures?: boolean;
    unnaturalPatterns?: boolean;
  };
}

/**
 * Fraud detection input
 */
export interface FraudDetectionInput {
  imageBuffer: Buffer;
  invoiceNo?: string;
  barcodeData?: string;
  customerPhone?: string;
}

/**
 * Fraud score result
 */
export interface FraudScore {
  overallScore: number; // 0-100 (higher = more suspicious)
  tamperingScore: number; // 0-100
  aiDetectionScore: number; // 0-100
  flags: string[];
  imageHash: string;
  duplicateFound: boolean;
  duplicateReceiptId?: string;
}

/**
 * Calculate perceptual hash (pHash) for duplicate detection
 * Uses perceptual hashing algorithm that detects similar images even after minor modifications
 * 
 * @param imageBuffer - Image data as Buffer
 * @returns pHash string (base64)
 * 
 * Example:
 * ```typescript
 * const hash = await calculateImageHash(buffer);
 * // Returns: "a1b2c3d4e5f6..."
 * ```
 */
export async function calculateImageHash(imageBuffer: Buffer): Promise<string> {
  try {
    console.log('🔐 Calculating image hash (pHash)...');
    
    // Resize image to 8x8 for perceptual hashing (standard pHash size)
    // This creates a consistent representation that's resistant to minor changes
    const resized = await sharp(imageBuffer)
      .resize(8, 8, { fit: 'fill' })
      .greyscale()
      .raw()
      .toBuffer();
    
    // Calculate average pixel value
    let sum = 0;
    for (let i = 0; i < resized.length; i++) {
      sum += resized[i];
    }
    const average = sum / resized.length;
    
    // Create hash: 1 if pixel > average, 0 otherwise
    let hashBits = '';
    for (let i = 0; i < resized.length; i++) {
      hashBits += resized[i] > average ? '1' : '0';
    }
    
    // Convert binary string to buffer and then to base64
    const hashBuffer = Buffer.from(hashBits, 'binary');
    const hash = crypto.createHash('sha256').update(hashBuffer).digest('base64');
    
    console.log(`✅ Image hash calculated: ${hash.substring(0, 16)}...`);
    return hash;
  } catch (error) {
    console.error('❌ Error calculating image hash:', error);
    throw new Error(`Hash calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Detect image tampering and manipulation
 * Checks for signs of image editing, compression anomalies, metadata mismatches
 * 
 * @param imageBuffer - Image data as Buffer
 * @returns Tampering detection result with score and indicators
 * 
 * Example:
 * ```typescript
 * const tampering = await detectImageTampering(buffer);
 * // Returns: { score: 45, indicators: ['Compression anomalies'], ... }
 * ```
 */
export async function detectImageTampering(imageBuffer: Buffer): Promise<TamperingResult> {
  try {
    console.log('🔍 Detecting image tampering...');
    
    const indicators: string[] = [];
    const details: TamperingResult['details'] = {};
    let score = 0;
    
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    const stats = await sharp(imageBuffer).stats();
    
    // Check 1: Compression anomalies (inconsistent JPEG quality)
    // JPEG images with multiple compression passes or inconsistent quality can indicate editing
    if (metadata.format === 'jpeg' || metadata.format === 'jpg') {
      // Check if image has been recompressed multiple times
      // This is a heuristic - real implementation would need more sophisticated analysis
      const fileSize = imageBuffer.length;
      const expectedSize = (metadata.width || 0) * (metadata.height || 0) * 3; // Rough estimate
      const compressionRatio = fileSize / expectedSize;
      
      // Very low compression ratio might indicate multiple recompressions
      if (compressionRatio < 0.01 && fileSize > 50000) {
        indicators.push('Compression anomalies detected');
        details.compressionAnomalies = true;
        score += 20;
      }
    }
    
    // Check 2: Metadata mismatches (EXIF vs actual image properties)
    if (metadata.exif) {
      // Check if EXIF dimensions match actual dimensions
      // This would require parsing EXIF data - simplified check here
      const hasMetadata = metadata.exif !== undefined;
      const hasDimensions = metadata.width && metadata.height;
      
      if (hasMetadata && !hasDimensions) {
        indicators.push('Metadata dimension mismatch');
        details.metadataMismatches = true;
        score += 15;
      }
    }
    
    // Check 3: Resolution manipulation signs (upscaling artifacts)
    // Very high resolution with low file size might indicate upscaling
    if (metadata.width && metadata.height) {
      const megapixels = (metadata.width * metadata.height) / 1000000;
      const fileSizeMB = imageBuffer.length / 1024 / 1024;
      const ratio = fileSizeMB / megapixels;
      
      // If image is very large (high MP) but file size is small, might be upscaled
      if (megapixels > 10 && ratio < 0.5) {
        indicators.push('Possible resolution manipulation');
        details.resolutionManipulation = true;
        score += 25;
      }
    }
    
    // Check 4: Lighting/shadow inconsistencies (simplified check)
    // Real implementation would analyze image statistics for inconsistencies
    if (stats.channels && stats.channels.length > 0) {
      const channel = stats.channels[0]; // Use first channel (or grayscale)
      const stdDev = channel.stdev || 0;
      const mean = channel.mean || 0;
      
      // Very low standard deviation might indicate artificial/manipulated images
      // Very high standard deviation might indicate inconsistent lighting
      if (stdDev < 10 || stdDev > 100) {
        indicators.push('Lighting inconsistencies detected');
        details.lightingInconsistencies = true;
        score += 15;
      }
    }
    
    // Cap score at 100
    score = Math.min(score, 100);
    
    console.log(`✅ Tampering detection complete: score ${score} (${indicators.length} indicators)`);
    
    return {
      score,
      indicators,
      details,
    };
  } catch (error) {
    console.error('❌ Tampering detection failed:', error);
    // Return safe default on error
    return {
      score: 0,
      indicators: [],
      details: {},
    };
  }
}

/**
 * Detect AI-generated images
 * Checks for common AI generation signatures and unnatural patterns
 * 
 * @param imageBuffer - Image data as Buffer
 * @returns AI detection result with probability
 * 
 * Example:
 * ```typescript
 * const aiDetection = await detectAIGeneratedImage(buffer);
 * // Returns: { probability: 30, indicators: [], ... }
 * ```
 */
export async function detectAIGeneratedImage(imageBuffer: Buffer): Promise<AIDetectionResult> {
  try {
    console.log('🤖 Detecting AI-generated images...');
    
    const indicators: string[] = [];
    const details: AIDetectionResult['details'] = {};
    let probability = 0;
    
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    
    // Check 1: Common AI generation signatures in metadata
    // Some AI tools leave signatures in metadata (software name, etc.)
    if (metadata.icc) {
      // Check ICC profile for AI tool signatures
      // This is simplified - real implementation would parse ICC data
      const iccString = JSON.stringify(metadata.icc);
      const aiSignatures = ['midjourney', 'dall-e', 'stable diffusion', 'ai', 'generated'];
      
      for (const signature of aiSignatures) {
        if (iccString.toLowerCase().includes(signature)) {
          indicators.push('AI generation signature in metadata');
          details.metadataSignatures = true;
          probability += 40;
          break;
        }
      }
    }
    
    // Check 2: Unnatural patterns (simplified heuristic)
    // Real implementation would use ML models or advanced image analysis
    const stats = await sharp(imageBuffer).stats();
    
    if (stats.channels && stats.channels.length > 0) {
      const channel = stats.channels[0];
      
      // Check for unusual standard deviation patterns
      // AI images often have very uniform or very chaotic pixel distributions
      if (channel.stdev !== undefined) {
        const stdev = channel.stdev;
        // Very low or very high standard deviation might indicate AI generation
        if (stdev < 10 || stdev > 80) {
          indicators.push('Unusual pixel distribution patterns');
          details.unnaturalPatterns = true;
          probability += 15;
        }
      }
    }
    
    // Check 3: Perfect symmetry or patterns (heuristic)
    // Some AI tools create unnaturally perfect patterns
    if (metadata.width && metadata.height) {
      const aspectRatio = metadata.width / metadata.height;
      
      // Perfect square or very specific ratios might indicate AI generation
      if (Math.abs(aspectRatio - 1.0) < 0.01 || Math.abs(aspectRatio - 1.618) < 0.01) {
        // This alone is not suspicious, but combined with other factors
        if (probability > 30) {
          probability += 10;
        }
      }
    }
    
    // Cap probability at 100
    probability = Math.min(probability, 100);
    
    console.log(`✅ AI detection complete: probability ${probability}% (${indicators.length} indicators)`);
    
    return {
      probability,
      indicators,
      details,
    };
  } catch (error) {
    console.error('❌ AI detection failed:', error);
    // Return safe default on error
    return {
      probability: 0,
      indicators: [],
      details: {},
    };
  }
}

/**
 * Calculate comprehensive fraud score
 * Combines all fraud detection checks into a single score
 * 
 * @param input - Fraud detection input with image and receipt data
 * @returns Fraud score with all detection results
 * 
 * Example:
 * ```typescript
 * const fraudScore = await calculateFraudScore({
 *   imageBuffer: buffer,
 *   invoiceNo: 'INV123',
 *   barcodeData: '123456',
 * });
 * 
 * if (fraudScore.overallScore > 70) {
 *   // Auto-reject
 * } else if (fraudScore.overallScore > 40) {
 *   // Flag for review
 * }
 * ```
 */
export async function calculateFraudScore(
  input: FraudDetectionInput
): Promise<FraudScore> {
  try {
    console.log('\n🔍 Starting fraud detection analysis...');
    
    await dbConnect();
    
    const flags: string[] = [];
    let overallScore = 0;
    
    // Step 1: Calculate image hash for duplicate detection
    const imageHash = await calculateImageHash(input.imageBuffer);
    
    // Step 2: Check for duplicate pHash
    let duplicateFound = false;
    let duplicateReceiptId: string | undefined;
    
    const existingByHash = await Receipt.findOne({
      imageHash: imageHash,
      status: { $in: ['approved', 'pending', 'flagged'] },
    });
    
    if (existingByHash) {
      duplicateFound = true;
      duplicateReceiptId = String(existingByHash._id);
      flags.push('Duplicate image (pHash match)');
      overallScore += 50; // High weight for duplicates
      console.log(`⚠️  Duplicate image found: ${duplicateReceiptId}`);
    }
    
    // Step 3: Check for duplicate invoice number
    if (input.invoiceNo) {
      const existingByInvoice = await Receipt.findOne({
        invoiceNo: input.invoiceNo,
        status: { $in: ['approved', 'pending', 'flagged'] },
        _id: { $ne: existingByHash?._id }, // Don't count the same receipt
      });
      
      if (existingByInvoice) {
        flags.push('Duplicate invoice number');
        overallScore += 30;
        console.log(`⚠️  Duplicate invoice: ${input.invoiceNo}`);
      }
    }
    
    // Step 4: Check for duplicate barcode
    if (input.barcodeData) {
      const existingByBarcode = await Receipt.findOne({
        barcodeData: input.barcodeData,
        status: { $in: ['approved', 'pending', 'flagged'] },
        _id: { $ne: existingByHash?._id }, // Don't count the same receipt
      });
      
      if (existingByBarcode) {
        flags.push('Duplicate barcode');
        overallScore += 30;
        console.log(`⚠️  Duplicate barcode: ${input.barcodeData}`);
      }
    }
    
    // Step 5: Detect image tampering
    const tamperingResult = await detectImageTampering(input.imageBuffer);
    const tamperingScore = tamperingResult.score;
    
    if (tamperingScore > 0) {
      flags.push(...tamperingResult.indicators);
      // Add tampering score with weight (70% of tampering score)
      overallScore += Math.round(tamperingScore * 0.7);
    }
    
    // Step 6: Detect AI-generated images
    const aiResult = await detectAIGeneratedImage(input.imageBuffer);
    const aiDetectionScore = aiResult.probability;
    
    if (aiDetectionScore > 0) {
      flags.push(...aiResult.indicators);
      // Add AI detection score with weight (50% of AI probability)
      overallScore += Math.round(aiDetectionScore * 0.5);
    }
    
    // Cap overall score at 100
    overallScore = Math.min(overallScore, 100);
    
    console.log(`✅ Fraud detection complete:`);
    console.log(`   Overall Score: ${overallScore}/100`);
    console.log(`   Tampering Score: ${tamperingScore}/100`);
    console.log(`   AI Detection Score: ${aiDetectionScore}/100`);
    console.log(`   Flags: ${flags.length} indicators`);
    
    return {
      overallScore,
      tamperingScore,
      aiDetectionScore,
      flags,
      imageHash,
      duplicateFound,
      duplicateReceiptId,
    };
  } catch (error) {
    console.error('❌ Fraud detection failed:', error);
    // Return safe default on error
    return {
      overallScore: 0,
      tamperingScore: 0,
      aiDetectionScore: 0,
      flags: ['Fraud detection error'],
      imageHash: '',
      duplicateFound: false,
    };
  }
}

