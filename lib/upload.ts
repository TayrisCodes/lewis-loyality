import multer from 'multer';
import { NextRequest } from 'next/server';

/**
 * File upload configuration using Multer
 * 
 * Handles multipart/form-data file uploads in Next.js API routes
 * Validates file size, type, and sanitizes filenames
 * 
 * Usage in API route:
 * ```typescript
 * const upload = await handleFileUpload(request);
 * if (!upload.success) {
 *   return NextResponse.json({ error: upload.error }, { status: 400 });
 * }
 * const file = upload.file;
 * const fields = upload.fields;
 * ```
 */

// Maximum file size: 8MB
const MAX_FILE_SIZE = 8 * 1024 * 1024;

// Allowed file types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'image/heif',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.heic', '.heif'];

/**
 * File upload result type
 */
export interface UploadResult {
  success: boolean;
  file?: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    size: number;
  };
  fields?: Record<string, string>;
  error?: string;
}

/**
 * Validate file type
 */
function validateFileType(file: Express.Multer.File): boolean {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
    return false;
  }
  
  // Check file extension
  const ext = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return false;
  }
  
  return true;
}

/**
 * Configure Multer for memory storage
 * Files are stored in memory as Buffer for processing
 */
const multerConfig = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // Only one file per upload
  },
  fileFilter: (req, file, cb) => {
    if (!validateFileType(file)) {
      cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`));
      return;
    }
    cb(null, true);
  },
});

/**
 * Handle file upload from Next.js request
 * 
 * @param request - Next.js request object
 * @param fieldName - Name of the file field (default: 'file')
 * @returns Upload result with file buffer and form fields
 * 
 * Example usage:
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const upload = await handleFileUpload(request);
 *   if (!upload.success) {
 *     return NextResponse.json({ error: upload.error }, { status: 400 });
 *   }
 *   
 *   const { file, fields } = upload;
 *   const storeId = fields.storeId;
 *   const phone = fields.phone;
 *   
 *   // Process file...
 * }
 * ```
 */
export async function handleFileUpload(
  request: NextRequest,
  fieldName: string = 'file'
): Promise<UploadResult> {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    
    // Get file from form data
    const fileEntry = formData.get(fieldName);
    
    if (!fileEntry) {
      return {
        success: false,
        error: `No file provided. Expected field name: "${fieldName}"`,
      };
    }
    
    // Verify it's a file
    if (!(fileEntry instanceof File)) {
      return {
        success: false,
        error: 'Invalid file data',
      };
    }
    
    const file = fileEntry as File;
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      };
    }
    
    if (file.size === 0) {
      return {
        success: false,
        error: 'File is empty',
      };
    }
    
    // Validate file type
    const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return {
        success: false,
        error: `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`,
      };
    }
    
    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      return {
        success: false,
        error: `Invalid MIME type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      };
    }
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Extract other form fields
    const fields: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      if (key !== fieldName && typeof value === 'string') {
        fields[key] = value;
      }
    }
    
    return {
      success: true,
      file: {
        buffer,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
      },
      fields,
    };
    
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'File upload failed',
    };
  }
}

/**
 * Validate image dimensions (optional advanced validation)
 * Can be used after upload to check if image is too small/large
 * 
 * Requires 'sharp' package (install if needed)
 */
export async function validateImageDimensions(
  buffer: Buffer,
  minWidth: number = 200,
  minHeight: number = 200,
  maxWidth: number = 4096,
  maxHeight: number = 4096
): Promise<{ valid: boolean; error?: string; dimensions?: { width: number; height: number } }> {
  try {
    // Dynamic import to avoid loading sharp if not used
    const sharp = (await import('sharp')).default;
    
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    
    if (width < minWidth || height < minHeight) {
      return {
        valid: false,
        error: `Image too small. Minimum: ${minWidth}x${minHeight}px`,
        dimensions: { width, height },
      };
    }
    
    if (width > maxWidth || height > maxHeight) {
      return {
        valid: false,
        error: `Image too large. Maximum: ${maxWidth}x${maxHeight}px`,
        dimensions: { width, height },
      };
    }
    
    return {
      valid: true,
      dimensions: { width, height },
    };
    
  } catch (error) {
    return {
      valid: false,
      error: 'Could not validate image dimensions',
    };
  }
}

/**
 * Compress/optimize image if needed
 * Reduces file size while maintaining quality for OCR
 * 
 * Requires 'sharp' package
 */
export async function optimizeImage(
  buffer: Buffer,
  maxWidth: number = 2048,
  quality: number = 85
): Promise<Buffer> {
  try {
    const sharp = (await import('sharp')).default;
    
    return await sharp(buffer)
      .resize(maxWidth, undefined, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality })
      .toBuffer();
      
  } catch (error) {
    console.error('Image optimization error:', error);
    // Return original if optimization fails
    return buffer;
  }
}

/**
 * Extract EXIF data from image (optional)
 * Can be used to get photo metadata (date, location, etc.)
 * 
 * Requires 'sharp' package
 */
export async function extractImageMetadata(
  buffer: Buffer
): Promise<{
  format?: string;
  width?: number;
  height?: number;
  space?: string;
  hasAlpha?: boolean;
  orientation?: number;
  exif?: any;
}> {
  try {
    const sharp = (await import('sharp')).default;
    const metadata = await sharp(buffer).metadata();
    
    return {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      space: metadata.space,
      hasAlpha: metadata.hasAlpha,
      orientation: metadata.orientation,
      exif: metadata.exif,
    };
    
  } catch (error) {
    console.error('Metadata extraction error:', error);
    return {};
  }
}

// Export configuration constants
export const UPLOAD_CONFIG = {
  maxFileSize: MAX_FILE_SIZE,
  maxFileSizeMB: MAX_FILE_SIZE / (1024 * 1024),
  allowedMimeTypes: ALLOWED_MIME_TYPES,
  allowedExtensions: ALLOWED_EXTENSIONS,
} as const;

/**
 * Helper: Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * Helper: Sanitize filename
 * Removes special characters and spaces
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
}


