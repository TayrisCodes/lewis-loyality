import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { adminApproveReceipt, adminRejectReceipt } from '@/lib/receiptValidator';
import { getReceiptPublicUrl } from '@/lib/storage';
import dbConnect from '@/lib/db';
import Receipt from '@/models/Receipt';
import Visit from '@/models/Visit';
import Customer from '@/models/Customer';
import Reward from '@/models/Reward';
import RewardRule from '@/models/RewardRule';
import {
  notifyManualReviewComplete,
  notifyReceiptAccepted,
  notifyReceiptRejected,
  notifyRewardMilestone,
  notifyRewardAvailable,
} from '@/lib/pushNotifications';

/**
 * POST /api/admin/receipts/:receiptId/review
 * 
 * Approve or reject a flagged receipt
 * 
 * Auth: Required (admin or superadmin)
 * 
 * Body:
 * {
 *   action: "approve" | "reject",
 *   reason?: string,  // Required for reject
 *   notes?: string    // Optional admin notes
 * }
 * 
 * Response (approve):
 * {
 *   success: true,
 *   message: "Receipt approved and visit recorded",
 *   visitId: "...",
 *   visitCount: 5,
 *   rewardEarned: true
 * }
 * 
 * Response (reject):
 * {
 *   success: true,
 *   message: "Receipt rejected"
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> }
) {
  try {
    // Authenticate
    const user = await requireAuth();
    const { receiptId } = await params;
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    
    const body = await request.json();
    const { action, reason, notes } = body;
    
    // Validate input
    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be "approve" or "reject"' },
        { status: 400 }
      );
    }
    
    if (action === 'reject' && !reason) {
      return NextResponse.json(
        { error: 'Reason is required for rejection' },
        { status: 400 }
      );
    }
    
    console.log(`\n👨‍💼 Admin review: ${action} receipt ${receiptId}`);
    console.log(`   Admin: ${user.email}`);
    
    // Get receipt
    const receipt = await Receipt.findById(receiptId).populate('storeId');
    
    if (!receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }
    
    // Check if admin can access this receipt
    if (user.role === 'admin') {
      // If receipt has no storeId, only super admin can review
      if (!receipt.storeId) {
        return NextResponse.json(
          { error: 'Only super admin can review receipts without store assignment' },
          { status: 403 }
        );
      }
      
      // Admin can only review receipts from their own store
      if (!user.storeId || String((receipt.storeId as any)._id) !== user.storeId) {
        return NextResponse.json(
          { error: 'You can only review receipts from your store' },
          { status: 403 }
        );
      }
    }
    
    // Check if receipt is already processed
    if (receipt.status === 'approved' || receipt.status === 'rejected') {
      return NextResponse.json(
        { error: `Receipt already ${receipt.status}` },
        { status: 400 }
      );
    }
    
    // ============================================================
    // HANDLE APPROVAL
    // ============================================================
    if (action === 'approve') {
      console.log('   ✅ Approving receipt...');
      
      // If receipt has no storeId, it cannot be approved yet
      // Super admin must assign store first (or we could add storeId to approve request)
      if (!receipt.storeId) {
        // Check if storeId is provided in request body (for super admin to assign)
        const { storeId: assignedStoreId } = body;
        
        if (!assignedStoreId) {
          return NextResponse.json(
            { error: 'Receipt has no store assigned. Please assign a store first or include storeId in approval request.' },
            { status: 400 }
          );
        }
        
        // Assign store (only super admin can do this)
        if (user.role !== 'superadmin') {
          return NextResponse.json(
            { error: 'Only super admin can assign store to receipts' },
            { status: 403 }
          );
        }
        
        receipt.storeId = assignedStoreId as any;
        console.log(`   📍 Store assigned: ${assignedStoreId}`);
      }
      
      // Update receipt status
      receipt.status = 'approved';
      receipt.reason = 'Manually approved by admin';
      receipt.reviewedBy = user.userId as any;
      receipt.reviewedAt = new Date();
      receipt.reviewNotes = notes;
      await receipt.save();
      
      // Find or create customer
      let customer = null;
      if (receipt.customerPhone) {
        customer = await Customer.findOne({ phone: receipt.customerPhone });
        
        if (!customer) {
          customer = await Customer.create({
            name: receipt.customerPhone,
            phone: receipt.customerPhone,
            totalVisits: 0,
          });
        }
        
        // Link customer to receipt
        receipt.customerId = customer._id as any;
        await receipt.save();
      }
      
      // Create visit record (storeId is now guaranteed to exist)
      const visit = await Visit.create({
        customerId: customer?._id,
        storeId: receipt.storeId,
        receiptId: receipt._id,
        visitMethod: 'receipt',
        timestamp: new Date(),
        rewardEarned: false,
      });
      
      console.log(`   ✅ Visit created: ${visit._id}`);
      
      // Update customer visit count
      if (customer) {
        customer.totalVisits = (customer.totalVisits || 0) + 1;
        customer.lastVisit = new Date();
        await customer.save();
        
        console.log(`   ✅ Customer visit count: ${customer.totalVisits}`);
        
        // Check for reward eligibility
        const rewardRule = await RewardRule.findOne({
          storeId: receipt.storeId,
          isActive: true,
        });
        
        if (rewardRule) {
          const isRewardEarned = customer.totalVisits % rewardRule.visitsNeeded === 0;
          
          if (isRewardEarned) {
            // Create reward
            const rewardCode = `LEWIS${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
            
            const reward = await Reward.create({
              customerId: customer._id,
              storeId: receipt.storeId,
              code: rewardCode,
              rewardType: rewardRule.rewardValue,
              issuedAt: new Date(),
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              status: 'claimed', // Automatically claimed when 5 visits completed
            });
            
            // Update visit
            visit.rewardEarned = true;
            await visit.save();
            
            console.log(`   🎁 Reward earned: ${reward.code}`);
            
            // Send notifications (non-blocking)
            if (receipt.customerPhone) {
              notifyManualReviewComplete(receipt.customerPhone, String(receipt._id), 'approved')
                .catch((err) => console.error('[Push] Failed to send review complete notification:', err));
              notifyReceiptAccepted(receipt.customerPhone, String(receipt._id), customer.totalVisits)
                .catch((err) => console.error('[Push] Failed to send receipt accepted notification:', err));
              notifyRewardMilestone(receipt.customerPhone, customer.totalVisits)
                .catch((err) => console.error('[Push] Failed to send reward milestone notification:', err));
              notifyRewardAvailable(receipt.customerPhone, String(reward._id))
                .catch((err) => console.error('[Push] Failed to send reward available notification:', err));
            }
            
            return NextResponse.json({
              success: true,
              message: 'Receipt approved - Reward earned!',
              data: {
                receiptId: String(receipt._id),
                visitId: String(visit._id),
                visitCount: customer.totalVisits,
                rewardEarned: true,
                rewardId: String(reward._id),
                rewardCode: reward.code,
              },
            });
          }
        }
        
        // Send notifications (non-blocking)
        if (receipt.customerPhone) {
          notifyManualReviewComplete(receipt.customerPhone, String(receipt._id), 'approved')
            .catch((err) => console.error('[Push] Failed to send review complete notification:', err));
          notifyReceiptAccepted(receipt.customerPhone, String(receipt._id), customer.totalVisits)
            .catch((err) => console.error('[Push] Failed to send receipt accepted notification:', err));
        }
        
        return NextResponse.json({
          success: true,
          message: 'Receipt approved and visit recorded',
          data: {
            receiptId: String(receipt._id),
            visitId: String(visit._id),
            visitCount: customer.totalVisits,
            rewardEarned: false,
          },
        });
      }
      
      // No customer linked
      return NextResponse.json({
        success: true,
        message: 'Receipt approved',
        data: {
          receiptId: String(receipt._id),
        },
      });
    }
    
    // ============================================================
    // HANDLE REJECTION
    // ============================================================
    if (action === 'reject') {
      console.log('   ❌ Rejecting receipt...');
      
      receipt.status = 'rejected';
      receipt.reason = reason;
      receipt.reviewedBy = user.userId as any;
      receipt.reviewedAt = new Date();
      receipt.reviewNotes = notes;
      await receipt.save();
      
      console.log(`   ✅ Receipt rejected: ${reason}`);
      
      // Send notification (non-blocking)
      if (receipt.customerPhone) {
        notifyManualReviewComplete(receipt.customerPhone, String(receipt._id), 'rejected')
          .catch((err) => console.error('[Push] Failed to send review complete notification:', err));
        notifyReceiptRejected(receipt.customerPhone, String(receipt._id), reason)
          .catch((err) => console.error('[Push] Failed to send receipt rejected notification:', err));
      }
      
      return NextResponse.json({
        success: true,
        message: 'Receipt rejected',
        data: {
          receiptId: String(receipt._id),
        },
      });
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
    
  } catch (error) {
    console.error('Admin review error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/receipts/:receiptId/review
 * 
 * Get receipt details for review
 * 
 * Auth: Required (admin or superadmin)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ receiptId: string }> }
) {
  try {
    const user = await requireAuth();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    await dbConnect();
    
    const { receiptId } = await params;
    
    const receipt = await Receipt.findById(receiptId)
      .populate('storeId', 'name address tin branchName minReceiptAmount')
      .populate('customerId', 'name phone totalVisits')
      .populate('reviewedBy', 'name email')
      .lean();
    
    if (!receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }
    
    // Check access
    if (user.role === 'admin') {
      if (!user.storeId || String((receipt.storeId as any)._id) !== user.storeId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        );
      }
    }
    
    // Add image URL
    const receiptWithUrl = {
      ...receipt,
      imageUrl: getReceiptPublicUrl(receipt.imageUrl),
    };
    
    return NextResponse.json({ receipt: receiptWithUrl });
    
  } catch (error) {
    console.error('Get receipt error:', error);
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

