import { NextRequest, NextResponse } from 'next/server';
import { handleFileUpload } from '@/lib/upload';
import { validateAndProcessReceipt } from '@/lib/receiptValidator';
import {
  notifyReceiptAccepted,
  notifyReceiptRejected,
  notifyRewardMilestone,
} from '@/lib/pushNotifications';

/**
 * POST /api/receipts/upload
 * 
 * Upload receipt image for validation
 * 
 * Request:
 * - Content-Type: multipart/form-data
 * - Fields:
 *   - file: Image file (JPG, PNG, HEIC) - max 8MB
 *   - storeId: Store ID (required)
 *   - phone: Customer phone number (optional)
 * 
 * Response:
 * - 200: Receipt validated successfully
 * - 400: Validation failed (rejected or flagged)
 * - 500: Server error
 * 
 * Example success response (approved):
 * {
 *   success: true,
 *   status: "approved",
 *   message: "Receipt approved and visit recorded",
 *   data: {
 *     receiptId: "...",
 *     visitId: "...",
 *     visitCount: 5,
 *     rewardEarned: true,
 *     rewardId: "..."
 *   }
 * }
 * 
 * Example failure response (rejected):
 * {
 *   success: false,
 *   status: "rejected",
 *   reason: "Amount 450 is below minimum 500",
 *   receiptId: "..."
 * }
 * 
 * Example flagged response:
 * {
 *   success: false,
 *   status: "flagged",
 *   reason: "Receipt needs manual review by admin",
 *   receiptId: "...",
 *   canRequestReview: true
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const TIMEOUT_MS = 8 * 60 * 1000; // 8 minutes timeout
  
  try {
    console.log('\n📥 Receipt upload request received');
    
    // ============================================================
    // STEP 1: Handle file upload
    // ============================================================
    const upload = await handleFileUpload(request, 'file');
    
    if (!upload.success) {
      console.error('Upload failed:', upload.error);
      return NextResponse.json(
        {
          success: false,
          error: upload.error,
        },
        { status: 400 }
      );
    }
    
    const { file, fields } = upload;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }
    
    console.log(`   ✅ File uploaded: ${file.originalName} (${Math.round(file.size / 1024)}KB)`);
    
    // ============================================================
    // STEP 2: Validate required fields
    // ============================================================
    if (!fields) {
      return NextResponse.json(
        { success: false, error: 'Missing form fields' },
        { status: 400 }
      );
    }
    
    const storeId = fields.storeId;  // Optional - can be identified from receipt TIN
    const phone = fields.phone;
    
    console.log(`   Store ID: ${storeId || 'Not provided - will identify from receipt'}`);
    console.log(`   Customer Phone: ${phone || 'Not provided'}`);
    
    // ============================================================
    // STEP 3: Validate and process receipt with timeout
    // ============================================================
    const processPromise = validateAndProcessReceipt({
      imageBuffer: file.buffer,
      originalFilename: file.originalName,
      storeId: storeId,
      customerPhone: phone,
    });
    
    // Add timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Processing timeout after ${Math.round(TIMEOUT_MS / 1000)}s. Please try again or contact support.`));
      }, TIMEOUT_MS);
    });
    
    const result = await Promise.race([processPromise, timeoutPromise]) as any;
    
    const totalDuration = Date.now() - startTime;
    console.log(`⏱️  Total processing time: ${Math.round(totalDuration / 1000)}s`);
    
    // ============================================================
    // STEP 4: Return appropriate response based on status
    // ============================================================
    
    if (result.success && result.status === 'approved') {
      // Auto-approved - visit counted
      console.log('✅ Receipt auto-approved');
      
      // Send push notification (non-blocking)
      if (phone) {
        notifyReceiptAccepted(phone, result.receiptId, result.visitCount || 0)
          .catch((err) => console.error('[Push] Failed to send receipt accepted notification:', err));
        
        // Send reward milestone notification if reward was earned
        if (result.rewardEarned && result.visitCount) {
          notifyRewardMilestone(phone, result.visitCount)
            .catch((err) => console.error('[Push] Failed to send reward milestone notification:', err));
        }
      }
      
      return NextResponse.json({
        success: true,
        status: 'approved',
        message: result.rewardEarned 
          ? '🎉 Receipt approved - Reward earned!' 
          : 'Receipt approved and visit recorded',
        data: {
          receiptId: result.receiptId,
          visitId: result.visitId,
          visitCount: result.visitCount,
          rewardEarned: result.rewardEarned || false,
          rewardId: result.rewardId,
        },
      });
    }
    
    if (result.status === 'rejected') {
      // Auto-rejected - clear rule violation
      console.log('❌ Receipt auto-rejected:', result.reason);
      
      // Send push notification (non-blocking)
      if (phone && result.receiptId) {
        notifyReceiptRejected(phone, result.receiptId, result.reason)
          .catch((err) => console.error('[Push] Failed to send receipt rejected notification:', err));
      }
      
      return NextResponse.json(
        {
          success: false,
          status: 'rejected',
          reason: result.reason,
          rejectionDetails: result.rejectionDetails, // Include detailed rejection information
          receiptId: result.receiptId,
          canRetake: true, // Customer can retake photo
          canRequestReview: false, // No manual review for clear fakes
        },
        { status: 400 }
      );
    }
    
    if (result.status === 'flagged') {
      // Flagged - needs manual review
      console.log('⚠️  Receipt flagged for review:', result.reason);
      
      return NextResponse.json(
        {
          success: false,
          status: 'flagged',
          reason: result.reason,
          rejectionDetails: result.rejectionDetails, // Include detailed rejection information
          receiptId: result.receiptId,
          canRetake: true, // Customer can retake photo
          canRequestReview: true, // Can request manual review
        },
        { status: 202 } // 202 Accepted (processing)
      );
    }
    
    // Fallback
    return NextResponse.json(
      {
        success: false,
        error: 'Unknown validation result',
      },
      { status: 500 }
    );
    
  } catch (error) {
    const elapsedTime = Date.now() - startTime;
    console.error(`❌ Receipt upload error after ${Math.round(elapsedTime / 1000)}s:`, error);
    
    // Check if it's a timeout error
    if (error instanceof Error && error.message.includes('timeout')) {
      return NextResponse.json(
        {
          success: false,
          status: 'flagged',
          reason: 'Processing is taking too long. Your receipt has been saved and will be reviewed manually by an admin.',
          error: error.message,
        },
        { status: 408 } // 408 Request Timeout
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        status: 'flagged',
        reason: 'Error processing receipt. An admin will review it manually.',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/receipts/upload
 * 
 * Get upload configuration and limits
 */
export async function GET() {
  return NextResponse.json({
    maxFileSize: 8 * 1024 * 1024, // 8MB
    maxFileSizeMB: 8,
    allowedTypes: ['image/jpeg', 'image/png', 'image/heic'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.heic'],
  });
}

