import { extractTextFromBufferPaddleOCR, isPaddleOCRAvailable } from './paddleocr';

/**
 * OCR (Optical Character Recognition) module
 * 
 * Uses PaddleOCR (Docker service) - Fastest and most accurate method
 * Typical processing time: 5-7 seconds
 * 
 * Extracts text from receipt images for validation
 * Supports multiple languages and preprocessing options
 * 
 * Usage:
 * ```typescript
 * const text = await extractTextFromBuffer(imageBuffer);
 * console.log('Extracted:', text);
 * ```
 */

/**
 * Extract text from image file
 * Uses PaddleOCR Docker service
 * 
 * @param imagePath - Absolute path to image file
 * @param options - OCR options
 * @returns Extracted text
 * 
 * Example:
 * ```typescript
 * const fs = require('fs');
 * const buffer = fs.readFileSync('/path/to/receipt.jpg');
 * const text = await extractTextFromBuffer(buffer);
 * // Returns: "LEWIS RETAIL\nTIN: 0003169685\n..."
 * ```
 */
export async function extractTextFromImage(
  imagePath: string,
  options?: {
    language?: string;
    confidence?: number; // Minimum confidence threshold (0-100)
  }
): Promise<string> {
  try {
    console.log(`📸 Starting OCR for: ${imagePath}`);
    const fs = await import('fs');
    const imageBuffer = fs.readFileSync(imagePath);
    return await extractTextFromBuffer(imageBuffer, options);
  } catch (error) {
    console.error('❌ OCR extraction failed:', error);
    throw new Error(`OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Aggressively optimize image for faster OCR processing
 * - Resize to 800px max width (receipts are readable at lower resolution, much faster OCR)
 * - Convert to grayscale (much faster OCR, better for text)
 * - Enhance contrast (better text recognition)
 * - Compress aggressively (smaller file = faster processing)
 * 
 * CRITICAL: Large images (2MB+) can take 5+ minutes without optimization
 * This function reduces processing time from minutes to seconds
 */
async function resizeImageForOCR(imageBuffer: Buffer, maxWidth: number = 800): Promise<Buffer> {
  try {
    const sharp = (await import('sharp')).default;
    
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    
    console.log(`📐 Optimizing image: ${metadata.width}x${metadata.height} (${Math.round(imageBuffer.length / 1024)}KB)`);
    
    // Always optimize - even smaller images benefit from grayscale
    let pipeline = sharp(imageBuffer);
    
    // Resize if larger than maxWidth (receipts are readable at lower resolution)
    if (metadata.width && metadata.width > maxWidth) {
      console.log(`   📏 Resizing to max width ${maxWidth}px...`);
      pipeline = pipeline.resize(maxWidth, null, {
        withoutEnlargement: true,
        fit: 'inside',
      });
    }
    
    // Aggressive optimization for speed:
    // 1. Grayscale (faster OCR, better for text recognition)
    // 2. Enhance contrast (improve text clarity)
    // 3. Light sharpen (improve text edges)
    // 4. Aggressive JPEG compression (smaller file = much faster OCR)
    const optimized = await pipeline
      .grayscale() // Grayscale is MUCH faster and better for text OCR
      .normalize() // Auto-adjust contrast for better text recognition
      .sharpen({ sigma: 0.5, m1: 1, m2: 2 }) // Light sharpen to improve text edges
      .jpeg({ 
        quality: 70, // Reduced from 80 to 70 for smaller file size and faster processing
        mozjpeg: true, // Better compression
        progressive: false, // Non-progressive for faster decoding
      })
      .toBuffer();
    
    const sizeReduction = Math.round((1 - optimized.length / imageBuffer.length) * 100);
    console.log(`   ✅ Image optimized: ${Math.round(imageBuffer.length / 1024)}KB → ${Math.round(optimized.length / 1024)}KB (${sizeReduction}% reduction)`);
    
    return optimized;
  } catch (error) {
    console.warn('⚠️  Image optimization failed, using original:', error);
    return imageBuffer;
  }
}

/**
 * Extract text from image buffer (in-memory)
 * 
 * Uses PaddleOCR Docker service (Primary method)
 * Typical processing time: 5-7 seconds
 * 
 * @param imageBuffer - Image data as Buffer
 * @param options - OCR options
 * @returns Extracted text
 * 
 * Example:
 * ```typescript
 * const buffer = await fs.readFile('receipt.jpg');
 * const text = await extractTextFromBuffer(buffer);
 * ```
 */
export async function extractTextFromBuffer(
  imageBuffer: Buffer,
  options?: {
    language?: string;
    confidence?: number;
    skipPaddleOCR?: boolean; // Force skip PaddleOCR (not recommended)
  }
): Promise<string> {
  const startTime = Date.now();
  console.log(`📸 Starting OCR from buffer (${Math.round(imageBuffer.length / 1024)}KB)`);

  // Use PaddleOCR (Primary method)
  if (options?.skipPaddleOCR) {
    throw new Error('PaddleOCR is the only OCR method. Cannot skip it.');
  }

  try {
    // Quick health check before attempting (saves time if service is down)
    const isAvailable = await isPaddleOCRAvailable();
    if (!isAvailable) {
      throw new Error('PaddleOCR service not available. Please ensure Docker container is running.');
    }
    
    // Optimize image BEFORE PaddleOCR for faster processing (especially for large images)
    // Reduced max width to 800px for faster processing while maintaining quality
    const optimizedForPaddle = await resizeImageForOCR(imageBuffer, 800); // Optimized for speed
    const text = await extractTextFromBufferPaddleOCR(optimizedForPaddle);
    const duration = Date.now() - startTime;
    console.log(`✅ OCR complete using PaddleOCR in ${Math.round(duration / 1000)}s`);
    return text;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ PaddleOCR failed after ${Math.round(duration / 1000)}s: ${errorMessage}`);
    throw new Error(`OCR failed: ${errorMessage}. Please ensure PaddleOCR Docker service is running.`);
  }
}

/**
 * Extract text with detailed word-level information
 * Uses PaddleOCR Docker service
 * 
 * @param imageBuffer - Image data as Buffer
 * @returns Detailed OCR result with text
 * 
 * Note: PaddleOCR provides text extraction. For word-level details,
 * you may need to parse the PaddleOCR response directly.
 */
export async function extractDetailedText(
  imageBuffer: Buffer
): Promise<{
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox?: { x0: number; y0: number; x1: number; y1: number };
  }>;
}> {
  try {
    console.log(`📸 Starting detailed OCR from buffer (${Math.round(imageBuffer.length / 1024)}KB)`);
    
    const text = await extractTextFromBuffer(imageBuffer);
    
    // Parse text into words (simple word splitting)
    const words = text
      .split(/\s+/)
      .filter(w => w.length > 0)
      .map(word => ({
        text: word,
        confidence: 95, // PaddleOCR doesn't provide per-word confidence easily
      }));

    return {
      text,
      confidence: 95, // Estimated confidence
      words,
    };
    
  } catch (error) {
    console.error('❌ Detailed OCR extraction failed:', error);
    throw new Error(`Detailed OCR failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Preprocess image before OCR (improve recognition accuracy)
 * Uses sharp to enhance contrast, denoise, etc.
 * 
 * @param imageBuffer - Original image buffer
 * @returns Preprocessed image buffer
 */
export async function preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
  try {
    const sharp = (await import('sharp')).default;
    
    // Apply preprocessing:
    // 1. Convert to grayscale (better for text recognition)
    // 2. Enhance contrast
    // 3. Sharpen text
    // 4. Denoise
    const processed = await sharp(imageBuffer)
      .grayscale()
      .normalize() // Auto-adjust contrast
      .sharpen({ sigma: 1 }) // Sharpen text edges
      .toBuffer();

    console.log('✅ Image preprocessed for OCR');
    return processed;
    
  } catch (error) {
    console.warn('⚠️  Image preprocessing failed, using original:', error);
    return imageBuffer;
  }
}

/**
 * Extract text from preprocessed image (for better accuracy)
 * Combines preprocessing + OCR
 * 
 * @param imageBuffer - Original image buffer
 * @param options - OCR options
 * @returns Extracted text
 */
export async function extractTextWithPreprocessing(
  imageBuffer: Buffer,
  options?: {
    confidence?: number;
  }
): Promise<string> {
  try {
    // Preprocess image
    const processed = await preprocessImage(imageBuffer);
    
    // Extract text from processed image
    return await extractTextFromBuffer(processed, options);
    
  } catch (error) {
    console.warn('⚠️  Preprocessed OCR failed, trying original image');
    // Fallback to original image
    return await extractTextFromBuffer(imageBuffer, options);
  }
}

/**
 * Get OCR service status
 * Useful for monitoring
 */
export async function getOCRStatus(): Promise<{
  available: boolean;
  service: string;
}> {
  const isAvailable = await isPaddleOCRAvailable();
  return {
    available: isAvailable,
    service: 'PaddleOCR',
  };
}

/**
 * Normalize extracted text for parsing
 * Cleans up common OCR errors and formatting issues
 * 
 * @param rawText - Raw OCR output
 * @returns Normalized text
 */
export function normalizeOCRText(rawText: string): string {
  return rawText
    // Remove excessive whitespace
    .replace(/[ \t]+/g, ' ')
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove multiple consecutive line breaks
    .replace(/\n{3,}/g, '\n\n')
    // Trim each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Remove leading/trailing whitespace
    .trim();
}

// Export OCR configuration
export const OCR_CONFIG = {
  language: 'eng',
  minConfidence: 60, // Minimum acceptable confidence
  preprocessingEnabled: true,
  workerReuse: true,
} as const;

/**
 * Example usage in API route:
 * 
 * ```typescript
 * import { extractTextFromBuffer, normalizeOCRText } from '@/lib/ocr';
 * 
 * export async function POST(request: NextRequest) {
 *   const upload = await handleFileUpload(request);
 *   const rawText = await extractTextFromBuffer(upload.file.buffer);
 *   const cleanText = normalizeOCRText(rawText);
 *   
 *   // Parse cleanText with receiptParser...
 * }
 * ```
 */


