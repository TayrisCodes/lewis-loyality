import { NextRequest, NextResponse } from 'next/server';
import { getReceiptImage, receiptImageExists } from '@/lib/storage';
import path from 'path';

/**
 * GET /api/receipts/image/:storeId/:filename
 * 
 * Serve receipt images
 * 
 * Auth: Optional (could add auth for privacy)
 * For now: Public access (images are not sensitive)
 * 
 * Future: Add authentication to protect customer privacy
 * 
 * Example:
 * GET /api/receipts/image/507f1f77bcf86cd799439011/1731345678901-a3f5c2d8.jpg
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string; filename: string }> }
) {
  try {
    const { storeId, filename } = await params;
    
    if (!storeId || !filename) {
      return NextResponse.json(
        { error: 'Store ID and filename are required' },
        { status: 400 }
      );
    }
    
    // Validate filename (prevent path traversal)
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { error: 'Invalid filename' },
        { status: 400 }
      );
    }
    
    // Construct relative path
    const relativePath = path.join('receipts', storeId, filename);
    
    // Check if file exists
    const exists = await receiptImageExists(relativePath);
    
    if (!exists) {
      return NextResponse.json(
        { error: 'Receipt image not found' },
        { status: 404 }
      );
    }
    
    // Get image buffer
    const imageBuffer = await getReceiptImage(relativePath);
    
    // Determine content type from extension
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'image/jpeg'; // Default
    
    if (ext === '.png') {
      contentType = 'image/png';
    } else if (ext === '.heic' || ext === '.heif') {
      contentType = 'image/heic';
    }
    
    // Return image
    return new NextResponse(imageBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': imageBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
      },
    });
    
  } catch (error) {
    console.error('Image serving error:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to serve image',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

