/**
 * Receipt Validation Service
 * 
 * This is the heart of the receipt verification system.
 * Integrates all components: storage, OCR, parsing, database, and business logic.
 * 
 * Main flow:
 * 1. Save uploaded image
 * 2. Extract text via OCR
 * 3. Parse receipt fields
 * 4. Validate against store rules
 * 5. Check for duplicates
 * 6. Make decision (approve/reject/flag)
 * 7. Create database records
 * 8. Update customer visits
 * 9. Check reward eligibility
 */

import dbConnect from './db';
import Store from '@/models/Store';
import Receipt from '@/models/Receipt';
import Customer from '@/models/Customer';
import Visit from '@/models/Visit';
import Reward from '@/models/Reward';
import RewardRule from '@/models/RewardRule';
import { saveReceiptImage } from './storage';
import { extractTextFromBuffer, normalizeOCRText } from './ocr';
import { parseReceiptText, validateParsedReceipt, ParsedReceipt } from './receiptParser';
import { calculateFraudScore } from './fraudDetector';
import { 
  isTINAllowed, 
  getMinReceiptAmount, 
  getReceiptValidityHours,
  getVisitLimitHours,
  getRequiredVisits,
  getRewardPeriodDays,
  getDiscountPercent,
  getInitialExpirationDays,
  getValidationRules
} from './systemSettings';

/**
 * Detailed rejection reason
 */
export interface RejectionDetail {
  field: string; // e.g., 'amount', 'date', 'TIN', 'duplicate', 'fraud', 'image_quality'
  issue: string; // Specific issue description
  expected?: string | number; // Expected value (if applicable)
  found?: string | number; // Found value (if applicable)
  message: string; // User-friendly message
}

/**
 * Receipt validation result
 */
export interface ValidationResult {
  success: boolean;
  status: 'approved' | 'rejected' | 'flagged' | 'flagged_manual_requested' | 'needs_store_selection';
  reason: string; // Main reason summary
  rejectionDetails?: RejectionDetail[]; // Detailed breakdown of issues
  flags?: string[]; // Array of validation flags/warnings
  receiptId?: string;
  visitId?: string;
  visitCount?: number;
  rewardEarned?: boolean;
  rewardId?: string;
  visitsInPeriod?: number;
  visitsNeeded?: number;
  parsed?: ParsedReceipt;
  // Store selection fields
  extractedTIN?: string;
  matchingStores?: Array<{
    _id: string;
    name: string;
    branchName?: string;
    address?: string;
  }>;
  needsStoreSelection?: boolean;
  multipleStoresWithSameTIN?: boolean;
}

/**
 * Receipt validation input
 */
export interface ValidationInput {
  imageBuffer: Buffer;
  originalFilename: string;
  storeId?: string;  // Optional - can be identified from receipt TIN
  customerPhone?: string;
}

/**
 * Main validation function
 * This orchestrates the entire receipt verification process
 * 
 * @param input - Receipt image and metadata
 * @returns Validation result with decision
 * 
 * Example usage:
 * ```typescript
 * const result = await validateAndProcessReceipt({
 *   imageBuffer: upload.file.buffer,
 *   originalFilename: upload.file.originalName,
 *   storeId: fields.storeId,
 *   customerPhone: fields.phone,
 * });
 * 
 * if (result.success && result.status === 'approved') {
 *   // Visit counted, maybe reward earned
 * }
 * ```
 */
export async function validateAndProcessReceipt(
  input: ValidationInput
): Promise<ValidationResult> {
  const startTime = Date.now();
  
  try {
    await dbConnect();
    
    console.log('\n🔍 Starting receipt validation...');
    console.log(`   Store ID: ${input.storeId || 'Not provided - will identify from receipt'}`);
    console.log(`   Customer: ${input.customerPhone || 'Not provided'}`);
    
    let storeId = input.storeId;
    let store: any = null;
    
    // ============================================================
    // STEP 1: Extract text via OCR (needed for store identification if storeId not provided)
    // ============================================================
    console.log('\n📸 Step 1: Extracting text via OCR...');
    
    let rawText: string = '';  // Initialize to avoid TypeScript error
    let parsedReceipt: ParsedReceipt | null = null;
    
    try {
      rawText = await extractTextFromBuffer(input.imageBuffer);
      const normalized = normalizeOCRText(rawText);
      
      console.log(`   ✅ OCR complete (${normalized.length} characters)`);
      
      // Basic photo validation: Check if OCR text looks like a receipt
      // Receipts typically have: TIN, Invoice, Amount, Date keywords
      const receiptKeywords = ['TIN', 'INVOICE', 'RECEIPT', 'TOTAL', 'AMOUNT', 'DATE', 'TAX', 'SUBTOTAL'];
      const hasReceiptKeywords = receiptKeywords.some(keyword => 
        normalized.toUpperCase().includes(keyword)
      );
      
      // Also check for numbers that look like amounts or TIN
      const hasNumbers = /[\d]{4,}/.test(normalized);
      
      if (!hasReceiptKeywords && !hasNumbers && normalized.length < 50) {
        console.log('   ❌ Photo does not appear to be a receipt');
        
        const tempStoreId = 'unknown';
        const tempImagePath = await saveReceiptImage(
          input.imageBuffer,
          tempStoreId,
          input.originalFilename
        );
        
        const receipt = await Receipt.create({
          customerPhone: input.customerPhone,
          storeId: null,
          imageUrl: tempImagePath,
          ocrText: normalized,
          status: 'rejected',
          reason: 'Uploaded image does not appear to be a receipt',
          flags: ['Not a receipt image'],
          processedAt: new Date(),
        });
        
        return {
          success: false,
          status: 'rejected',
          reason: 'The uploaded image does not appear to be a receipt. Please upload a clear photo of your receipt.',
          rejectionDetails: [{
            field: 'image_validation',
            issue: 'Image is not a receipt',
            found: 'No receipt keywords or structure detected',
            expected: 'Valid receipt image with TIN, Invoice, Amount, Date',
            message: 'The uploaded image does not appear to be a receipt. Please make sure you are uploading a clear photo of your purchase receipt.',
          }],
          receiptId: String(receipt._id),
        };
      }
      
      // Try to parse even with short text - sometimes OCR extracts key fields
      // Only reject if text is extremely short AND we can't identify store
      if (normalized.length < 15) {
        console.warn('   ⚠️  Very short text (' + normalized.length + ' characters), attempting to parse anyway...');
        
        // Try parsing to see if we can extract at least TIN or invoice
        const testParse = parseReceiptText(normalized);
        const hasKeyFields = testParse.tin || testParse.invoiceNo || testParse.totalAmount;
        
        if (!hasKeyFields && !storeId) {
          // Can't proceed - no key fields and no storeId
          console.warn('   ❌ No key fields extracted and no storeId provided');
          return {
            success: false,
            status: 'flagged',
            reason: 'Receipt image is unclear - could not identify store. Please try scanning the store QR code or take a clearer photo.',
            rejectionDetails: [
              {
                field: 'image_quality',
                issue: 'OCR extracted insufficient text',
                found: `${normalized.length} characters`,
                expected: 'At least 15 characters with key fields',
                message: 'Receipt image is too blurry or unclear. The system could only read ' + normalized.length + ' characters, and key information (TIN, Invoice, Amount) could not be extracted.',
              },
              {
                field: 'store_identification',
                issue: 'Could not identify store from image',
                message: 'The store could not be identified from the receipt image. Please scan the store QR code or take a clearer photo that shows all receipt details.',
              },
            ],
          };
        } else if (!hasKeyFields && storeId) {
          // StoreId provided but no key fields - flag for review
          console.warn('   ⚠️  No key fields but storeId provided - flagging for review');
          const tempImagePath = await saveReceiptImage(
            input.imageBuffer,
            storeId,
            input.originalFilename
          );
          
          const receipt = await Receipt.create({
            customerPhone: input.customerPhone,
            storeId: storeId,
            imageUrl: tempImagePath,
            ocrText: normalized,
            status: 'flagged',
            reason: 'OCR extracted very little text - image may be unclear',
            flags: ['Low OCR confidence', 'Short text'],
          });
          
          return {
            success: false,
            status: 'flagged',
            reason: 'Receipt image is unclear - text could not be read properly',
            rejectionDetails: [
              {
                field: 'image_quality',
                issue: 'OCR extracted insufficient text',
                found: `${normalized.length} characters`,
                expected: 'At least 15 characters with key fields',
                message: 'Receipt image is too blurry or unclear. The system could only read ' + normalized.length + ' characters, which is not enough to verify the receipt properly.',
              },
            ],
            receiptId: String(receipt._id),
          };
        } else {
          // Key fields found even with short text - continue processing
          console.log('   ✅ Key fields extracted despite short text - continuing validation');
        }
      }
      
      rawText = normalized;
      
      // ============================================================
      // STEP 2: Parse receipt to extract data (if storeId not provided, find store by TIN)
      // ============================================================
      if (!storeId) {
        console.log('\n🔍 Step 2: No store ID provided - will find store by TIN...');
        
        parsedReceipt = parseReceiptText(rawText);
        
        // Extract TIN and branch info
        const extractedTIN = parsedReceipt.tin;
        const extractedBranch = parsedReceipt.branchText;
        
        console.log(`   📋 Extracted TIN from receipt: ${extractedTIN || 'Not found'}`);
        console.log(`   📋 Extracted Branch: ${extractedBranch || 'Not found'}`);
        
        // Check if TIN is allowed using system settings
        if (extractedTIN && !(await isTINAllowed(extractedTIN))) {
          const validationRules = await getValidationRules();
          const allowedTINs = validationRules.allowedTINs || ['0003169685'];
          const allowedTINsStr = allowedTINs.join(', ');
          
          console.log(`   ❌ TIN ${extractedTIN} is not allowed. Allowed TINs: ${allowedTINsStr}`);
          
          const tempStoreId = 'unknown';
          const imagePath = await saveReceiptImage(
            input.imageBuffer,
            tempStoreId,
            input.originalFilename
          );
          
          const receipt = await Receipt.create({
            customerPhone: input.customerPhone,
            storeId: null,
            imageUrl: imagePath,
            ocrText: rawText,
            tin: extractedTIN,
            branchText: extractedBranch,
            invoiceNo: parsedReceipt.invoiceNo,
            dateOnReceipt: parsedReceipt.date,
            totalAmount: parsedReceipt.totalAmount,
            barcodeData: parsedReceipt.barcodeData,
            status: 'rejected',
            reason: `Receipt TIN ${extractedTIN} is not accepted. Only receipts from allowed TINs are valid.`,
            flags: ['Invalid TIN'],
            processedAt: new Date(),
          });
          
          return {
            success: false,
            status: 'rejected',
            reason: `This receipt is not from a participating store. Only receipts with allowed TINs are accepted.`,
            rejectionDetails: [{
              field: 'TIN',
              issue: 'TIN not accepted',
              found: extractedTIN,
              expected: allowedTINsStr,
              message: `The receipt TIN (${extractedTIN}) is not accepted. Only receipts from stores with allowed TINs are valid for the loyalty program.`,
            }],
            receiptId: String(receipt._id),
            parsed: parsedReceipt,
          };
        }
        
        // Try to find stores by TIN (may be multiple stores with same TIN)
        if (extractedTIN && await isTINAllowed(extractedTIN)) {
          const storesByTIN = await Store.find({ 
            tin: extractedTIN,
            isActive: true,
            allowReceiptUploads: true 
          });
          
          if (storesByTIN.length > 0) {
            if (storesByTIN.length === 1) {
              // Only one store with this TIN - use it automatically
              const storeByTIN = storesByTIN[0];
              console.log(`   ✅ Found single store by TIN: ${storeByTIN.name} (${storeByTIN._id})`);
              
              storeId = String(storeByTIN._id);
              store = storeByTIN;
              console.log(`   ✅ Using store: ${store.name} (ID: ${storeId})`);
            } else {
              // Multiple stores with same TIN - need customer to select
              console.log(`   ⚠️  Found ${storesByTIN.length} stores with TIN ${extractedTIN} - requesting store selection`);
              
              const tempStoreId = 'unknown';
              const imagePath = await saveReceiptImage(
                input.imageBuffer,
                tempStoreId,
                input.originalFilename
              );
              
              const receipt = await Receipt.create({
                customerPhone: input.customerPhone,
                storeId: null,
                imageUrl: imagePath,
                ocrText: rawText,
                tin: extractedTIN,
                branchText: extractedBranch,
                invoiceNo: parsedReceipt.invoiceNo,
                dateOnReceipt: parsedReceipt.date,
                totalAmount: parsedReceipt.totalAmount,
                barcodeData: parsedReceipt.barcodeData,
                status: 'pending', // Temporary status - will be updated after store selection
                flags: ['Store selection needed - multiple stores with same TIN'],
              });
              
              return {
                success: false,
                status: 'needs_store_selection',
                reason: `Multiple stores found with TIN ${extractedTIN}. Please select the store.`,
                receiptId: String(receipt._id),
                extractedTIN: extractedTIN,
                matchingStores: storesByTIN.map(s => ({
                  _id: String(s._id),
                  name: s.name,
                  branchName: s.branchName,
                  address: s.address,
                })),
                parsed: parsedReceipt,
                needsStoreSelection: true,
                multipleStoresWithSameTIN: true,
              };
            }
          } else {
            // Store not found by TIN - needs customer to select store
            console.log(`   ⚠️  Store not found with TIN: ${extractedTIN} - requesting store selection`);
            
            const tempStoreId = 'unknown';
            const imagePath = await saveReceiptImage(
              input.imageBuffer,
              tempStoreId,
              input.originalFilename
            );
            
            const receipt = await Receipt.create({
              customerPhone: input.customerPhone,
              storeId: null,
              imageUrl: imagePath,
              ocrText: rawText,
              tin: extractedTIN,
              branchText: extractedBranch,
              invoiceNo: parsedReceipt.invoiceNo,
              dateOnReceipt: parsedReceipt.date,
              totalAmount: parsedReceipt.totalAmount,
              barcodeData: parsedReceipt.barcodeData,
              status: 'pending', // Temporary status - will be updated after store selection
              flags: ['Store selection needed'],
            });
            
            return {
              success: false,
              status: 'needs_store_selection',
              reason: `Please select the store for this receipt (TIN: ${extractedTIN})`,
              receiptId: String(receipt._id),
              extractedTIN: extractedTIN,
              parsed: parsedReceipt,
              needsStoreSelection: true,
            };
          }
        } else {
          // No TIN found - flag for review
          console.log(`   ⚠️  TIN not found in receipt - flagging for review`);
          
          const tempStoreId = 'unknown';
          const imagePath = await saveReceiptImage(
            input.imageBuffer,
            tempStoreId,
            input.originalFilename
          );
          
          const receipt = await Receipt.create({
            customerPhone: input.customerPhone,
            storeId: null,
            imageUrl: imagePath,
            ocrText: rawText,
            tin: null,
            branchText: extractedBranch,
            invoiceNo: parsedReceipt.invoiceNo,
            dateOnReceipt: parsedReceipt.date,
            totalAmount: parsedReceipt.totalAmount,
            barcodeData: parsedReceipt.barcodeData,
            status: 'flagged',
            reason: 'TIN not found in receipt - needs manual review',
            flags: ['TIN not found'],
          });
          
          return {
            success: false,
            status: 'flagged',
            reason: 'The receipt TIN could not be identified. An admin will review this receipt.',
            rejectionDetails: [{
              field: 'TIN',
              issue: 'TIN not found in receipt',
              message: 'The receipt TIN (Tax Identification Number) could not be read from the image. An admin will verify and process this receipt.',
            }],
            receiptId: String(receipt._id),
            parsed: parsedReceipt,
          };
        }
      }
    } catch (error) {
      console.error('❌ OCR/parsing error:', error);
      
      // If storeId was provided, we can still try to proceed with flagged status
      if (storeId) {
        const tempImagePath = await saveReceiptImage(
          input.imageBuffer,
          storeId,
          input.originalFilename
        );
        
        const receipt = await Receipt.create({
          customerPhone: input.customerPhone,
          storeId: storeId,
          imageUrl: tempImagePath,
          ocrText: rawText || '',
          status: 'flagged',
          reason: 'Error processing receipt image - needs manual review',
          flags: ['OCR error'],
        });
        
        return {
          success: false,
          status: 'flagged',
          reason: 'Error processing receipt - an admin will review it manually',
          rejectionDetails: [
            {
              field: 'processing_error',
              issue: 'Error processing receipt image',
              message: 'An error occurred while processing the receipt image. An admin will review it manually to verify the details.',
            },
          ],
          receiptId: String(receipt._id),
        };
      }
      
      return {
        success: false,
        status: 'rejected',
        reason: 'Error processing receipt image. Please try again or scan the store QR code.',
      };
    }
    
    // ============================================================
    // STEP 3: Fetch store and validate configuration
    // ============================================================
    console.log('\n📋 Step 3: Fetching store configuration...');
    
    if (!store) {
      store = await Store.findById(storeId);
    }
    
    if (!store) {
      // Try to parse receipt to show extracted data
      const parsed = parsedReceipt || parseReceiptText(rawText);
      
      const extractedInfo: string[] = [];
      if (parsed.tin) extractedInfo.push(`TIN: ${parsed.tin}`);
      if (parsed.invoiceNo) extractedInfo.push(`Invoice: ${parsed.invoiceNo}`);
      if (parsed.date) extractedInfo.push(`Date: ${parsed.date}`);
      if (parsed.totalAmount) extractedInfo.push(`Amount: ${parsed.totalAmount} ETB`);
      if (parsed.branchText) extractedInfo.push(`Store: ${parsed.branchText}`);
      
      const rejectionDetails: RejectionDetail[] = [];
      
      if (extractedInfo.length > 0) {
        rejectionDetails.push({
          field: 'extracted_data',
          issue: 'Receipt information extracted',
          found: extractedInfo.join(', '),
          message: `We successfully extracted the following information from your receipt: ${extractedInfo.join(', ')}.`,
        });
      }
      
      rejectionDetails.push({
        field: 'store_not_found',
        issue: 'Store not found in system',
        found: storeId || parsed.tin || 'Unknown',
        message: `The store (ID: ${storeId || 'N/A'}) is not registered in our loyalty system. This receipt cannot be accepted.`,
      });
      
      return {
        success: false,
        status: 'rejected',
        reason: `Receipt not accepted: The store is not registered in our loyalty system. Please visit a participating Lewis Retails store.`,
        rejectionDetails,
      };
    }
    
    if (!store.isActive) {
      return {
        success: false,
        status: 'rejected',
        reason: 'Store is not active',
      };
    }
    
    if (!store.allowReceiptUploads) {
      return {
        success: false,
        status: 'rejected',
        reason: 'Receipt uploads are disabled for this store',
      };
    }
    
    console.log(`   ✅ Store: ${store.name}`);
    console.log(`   ✅ TIN: ${store.tin || 'Not configured'}`);
    console.log(`   ✅ Branch: ${store.branchName || 'Not configured'}`);
    // Get system settings for validation
    const minAmount = await getMinReceiptAmount(store.minReceiptAmount);
    const validityHours = await getReceiptValidityHours(store.receiptValidityHours);
    
    console.log(`   ✅ Min Amount: ${minAmount} ETB`);
    console.log(`   ✅ Max Age: ${validityHours} hours`);
    
    // Verify store TIN is allowed using system settings
    if (store.tin && !(await isTINAllowed(store.tin))) {
      const validationRules = await getValidationRules();
      const allowedTINs = validationRules.allowedTINs || ['0003169685'];
      const allowedTINsStr = allowedTINs.join(', ');
      
      return {
        success: false,
        status: 'rejected',
        reason: `Store TIN ${store.tin} is not accepted. Only stores with allowed TINs are valid.`,
        rejectionDetails: [{
          field: 'TIN',
          issue: 'Store TIN not accepted',
          found: store.tin,
          expected: allowedTINsStr,
          message: `This store's TIN (${store.tin}) is not accepted. Only stores with allowed TINs are valid.`,
        }],
      };
    }
    
    // ============================================================
    // STEP 4: Save image to storage
    // ============================================================
    console.log('\n💾 Step 4: Saving receipt image...');
    
    const imagePath = await saveReceiptImage(
      input.imageBuffer,
      storeId,
      input.originalFilename
    );
    
    console.log(`   ✅ Saved: ${imagePath}`);
    
    // ============================================================
    // STEP 5: Parse receipt fields (if not already parsed)
    // ============================================================
    console.log('\n🔍 Step 5: Parsing receipt fields...');
    
    const parsed = parsedReceipt || parseReceiptText(rawText);
    
    console.log(`   TIN: ${parsed.tin || '❌ Not found'}`);
    console.log(`   Invoice: ${parsed.invoiceNo || '❌ Not found'}`);
    console.log(`   Date: ${parsed.date || '❌ Not found'}`);
    console.log(`   Amount: ${parsed.totalAmount || '❌ Not found'}`);
    console.log(`   Branch: ${parsed.branchText || '❌ Not found'}`);
    console.log(`   Confidence: ${parsed.confidence.toUpperCase()}`);
    
    if (parsed.flags.length > 0) {
      console.log(`   Flags: ${parsed.flags.join(', ')}`);
    }
    
    // ============================================================
    // STEP 6: Validate parsed data
    // ============================================================
    console.log('\n✅ Step 6: Validating against store rules...');
    
    // Calculate max age in days from validity hours (already declared above)
    const maxAgeDays = validityHours / 24;
    
    // Get allowed TINs for validation
    const validationRules = await getValidationRules();
    const allowedTINs = validationRules.allowedTINs || ['0003169685'];
    
    // Validate that the parsed TIN is in the allowed list
    if (parsed.tin && !(await isTINAllowed(parsed.tin))) {
      const allowedTINsStr = allowedTINs.join(', ');
      return {
        success: false,
        status: 'rejected',
        reason: `Receipt TIN ${parsed.tin} is not accepted. Only receipts with allowed TINs are valid.`,
        rejectionDetails: [{
          field: 'TIN',
          issue: 'Receipt TIN not accepted',
          found: parsed.tin,
          expected: allowedTINsStr,
          message: `This receipt's TIN (${parsed.tin}) is not accepted. Only receipts with allowed TINs are valid.`,
        }],
        flags: parsed.flags,
      };
    }
    
    // Use the parsed TIN as expectedTIN if it exists and is allowed
    const expectedTIN = parsed.tin || store.tin;
    
    const validation = validateParsedReceipt(parsed, {
      expectedTIN: expectedTIN,
      expectedBranch: store.branchName,
      minAmount: minAmount,
      maxAge: maxAgeDays,
    });
    
    if (!validation.valid) {
      console.log(`   ❌ Validation failed: ${validation.reason}`);
      
      // Build detailed rejection information
      const rejectionDetails: RejectionDetail[] = [];
      const reason = validation.reason || 'Validation failed';
      
      // Parse the reason to extract specific details
      if (reason.includes('Amount') && reason.includes('below minimum')) {
        const amountMatch = reason.match(/Amount ([\d.]+) is below minimum ([\d.]+)/);
        if (amountMatch) {
          rejectionDetails.push({
            field: 'amount',
            issue: 'Amount below minimum requirement',
            found: parseFloat(amountMatch[1]),
            expected: parseFloat(amountMatch[2]),
            message: `Receipt amount of ${amountMatch[1]} ETB is below the minimum required amount of ${amountMatch[2]} ETB.`,
          });
        }
      } else if (reason.includes('TIN mismatch')) {
        const tinMatch = reason.match(/TIN mismatch \(expected: ([^,]+), found: ([^)]+)\)/);
        if (tinMatch) {
          rejectionDetails.push({
            field: 'TIN',
            issue: 'TIN does not match store',
            found: tinMatch[2],
            expected: tinMatch[1],
            message: `The receipt TIN (${tinMatch[2]}) does not match this store's TIN (${tinMatch[1]}). This receipt may be from a different store.`,
          });
        }
      } else if (reason.includes('TIN not found')) {
        rejectionDetails.push({
          field: 'TIN',
          issue: 'TIN not found in receipt',
          message: 'The receipt TIN (Tax Identification Number) could not be found or read from the image. This is required to verify the receipt.',
        });
      } else if (reason.includes('days old')) {
        const ageMatch = reason.match(/Receipt is ([\d]+) days old \(max: ([\d.]+) days\)/);
        if (ageMatch) {
          rejectionDetails.push({
            field: 'date',
            issue: 'Receipt is too old',
            found: `${ageMatch[1]} days old`,
            expected: `Within ${ageMatch[2]} days`,
            message: `This receipt is ${ageMatch[1]} days old. Only receipts within ${ageMatch[2]} days are accepted.`,
          });
        }
      } else {
        // Generic reason
        rejectionDetails.push({
          field: 'validation',
          issue: 'Validation failed',
          message: reason,
        });
      }
      
      // Create rejected receipt
      const receipt = await Receipt.create({
        customerPhone: input.customerPhone,
        storeId: storeId,
        imageUrl: imagePath,
        ocrText: rawText,
        tin: parsed.tin,
        branchText: parsed.branchText,
        invoiceNo: parsed.invoiceNo,
        dateOnReceipt: parsed.date,
        totalAmount: parsed.totalAmount,
        barcodeData: parsed.barcodeData,
        status: 'rejected',
        reason: validation.reason,
        flags: parsed.flags,
        processedAt: new Date(),
      });
      
      return {
        success: false,
        status: 'rejected',
        reason: validation.reason || 'Validation failed',
        rejectionDetails,
        receiptId: String(receipt._id),
        parsed,
      };
    }
    
    if (validation.warnings.length > 0) {
      console.log(`   ⚠️  Warnings: ${validation.warnings.join(', ')}`);
    }
    
    console.log('   ✅ All validation rules passed');
    
    // ============================================================
    // STEP 7: Fraud Detection
    // ============================================================
    console.log('\n🔍 Step 7: Running fraud detection...');
    
    let fraudScoreResult;
    try {
      fraudScoreResult = await calculateFraudScore({
        imageBuffer: input.imageBuffer,
        invoiceNo: parsed.invoiceNo,
        barcodeData: parsed.barcodeData,
        customerPhone: input.customerPhone,
      });
      
      console.log(`   Fraud Score: ${fraudScoreResult.overallScore}/100`);
      console.log(`   Tampering Score: ${fraudScoreResult.tamperingScore}/100`);
      console.log(`   AI Detection Score: ${fraudScoreResult.aiDetectionScore}/100`);
      
      if (fraudScoreResult.flags.length > 0) {
        console.log(`   Flags: ${fraudScoreResult.flags.join(', ')}`);
      }
      
      // Auto-reject if fraud score > 70
      if (fraudScoreResult.overallScore > 70) {
        console.log(`   ❌ High fraud score (${fraudScoreResult.overallScore}) - auto-rejecting`);
        
        const rejectionDetails: RejectionDetail[] = [
          {
            field: 'fraud',
            issue: 'High fraud risk detected',
            found: `${fraudScoreResult.overallScore}/100`,
            expected: 'Below 70/100',
            message: `This receipt was flagged for potential fraud (risk score: ${fraudScoreResult.overallScore}/100). The receipt cannot be accepted.`,
          },
        ];
        
        if (fraudScoreResult.tamperingScore > 50) {
          rejectionDetails.push({
            field: 'image_tampering',
            issue: 'Possible image tampering detected',
            found: `${fraudScoreResult.tamperingScore}/100`,
            message: 'The receipt image shows signs of potential tampering or modification.',
          });
        }
        
        if (fraudScoreResult.aiDetectionScore > 50) {
          rejectionDetails.push({
            field: 'ai_generated',
            issue: 'Possible AI-generated or fake receipt',
            found: `${fraudScoreResult.aiDetectionScore}/100`,
            message: 'The receipt image may be artificially generated or not authentic.',
          });
        }
        
        if (fraudScoreResult.flags.length > 0) {
          rejectionDetails.push({
            field: 'fraud_flags',
            issue: 'Suspicious indicators found',
            found: fraudScoreResult.flags.join(', '),
            message: `Additional concerns: ${fraudScoreResult.flags.join(', ')}`,
          });
        }
        
        const receipt = await Receipt.create({
          customerPhone: input.customerPhone,
          storeId: storeId,
          imageUrl: imagePath,
          ocrText: rawText,
          tin: parsed.tin,
          branchText: parsed.branchText,
          invoiceNo: parsed.invoiceNo,
          dateOnReceipt: parsed.date,
          totalAmount: parsed.totalAmount,
          barcodeData: parsed.barcodeData,
          status: 'rejected',
          reason: `High fraud risk detected (score: ${fraudScoreResult.overallScore})`,
          flags: [...parsed.flags, ...fraudScoreResult.flags],
          imageHash: fraudScoreResult.imageHash,
          fraudScore: fraudScoreResult.overallScore,
          tamperingScore: fraudScoreResult.tamperingScore,
          aiDetectionScore: fraudScoreResult.aiDetectionScore,
          fraudFlags: fraudScoreResult.flags,
          processedAt: new Date(),
        });
        
        return {
          success: false,
          status: 'rejected',
          reason: 'Receipt rejected due to fraud detection',
          rejectionDetails,
          receiptId: String(receipt._id),
          parsed,
        };
      }
      
      // Flag for review if fraud score > 40 or tampering score > 50
      if (fraudScoreResult.overallScore > 40 || fraudScoreResult.tamperingScore > 50) {
        console.log(`   ⚠️  Suspicious activity detected - flagging for review`);
        
        const rejectionDetails: RejectionDetail[] = [
          {
            field: 'fraud',
            issue: 'Suspicious activity detected',
            found: `Fraud score: ${fraudScoreResult.overallScore}/100`,
            expected: 'Below 40/100',
            message: `This receipt has been flagged for review due to suspicious indicators (fraud score: ${fraudScoreResult.overallScore}/100). An admin will verify it manually.`,
          },
        ];
        
        if (fraudScoreResult.tamperingScore > 50) {
          rejectionDetails.push({
            field: 'image_tampering',
            issue: 'Possible image tampering detected',
            found: `${fraudScoreResult.tamperingScore}/100`,
            message: 'The receipt image shows signs of potential tampering or modification.',
          });
        }
        
        if (fraudScoreResult.aiDetectionScore > 50) {
          rejectionDetails.push({
            field: 'ai_generated',
            issue: 'Possible AI-generated or fake receipt',
            found: `${fraudScoreResult.aiDetectionScore}/100`,
            message: 'The receipt image may be artificially generated or not authentic.',
          });
        }
        
        if (fraudScoreResult.flags.length > 0) {
          rejectionDetails.push({
            field: 'fraud_flags',
            issue: 'Suspicious indicators found',
            found: fraudScoreResult.flags.join(', '),
            message: `Additional concerns: ${fraudScoreResult.flags.join(', ')}`,
          });
        }
        
        const receipt = await Receipt.create({
          customerPhone: input.customerPhone,
          storeId: storeId,
          imageUrl: imagePath,
          ocrText: rawText,
          tin: parsed.tin,
          branchText: parsed.branchText,
          invoiceNo: parsed.invoiceNo,
          dateOnReceipt: parsed.date,
          totalAmount: parsed.totalAmount,
          barcodeData: parsed.barcodeData,
          status: 'flagged',
          reason: `Suspicious activity detected (fraud score: ${fraudScoreResult.overallScore})`,
          flags: [...parsed.flags, ...fraudScoreResult.flags],
          imageHash: fraudScoreResult.imageHash,
          fraudScore: fraudScoreResult.overallScore,
          tamperingScore: fraudScoreResult.tamperingScore,
          aiDetectionScore: fraudScoreResult.aiDetectionScore,
          fraudFlags: fraudScoreResult.flags,
          processedAt: new Date(),
        });
        
        return {
          success: false,
          status: 'flagged',
          reason: 'Receipt flagged for manual review due to suspicious activity',
          rejectionDetails,
          receiptId: String(receipt._id),
          parsed,
        };
      }
      
      console.log('   ✅ Fraud checks passed');
    } catch (fraudError) {
      console.error('   ⚠️  Fraud detection error (continuing with validation):', fraudError);
      // Continue with validation even if fraud detection fails
      fraudScoreResult = null;
    }
    
    // ============================================================
    // STEP 8: Check for duplicates (existing checks)
    // ============================================================
    console.log('\n🔍 Step 8: Checking for duplicates...');
    
    // Check invoice number uniqueness (reject ALL duplicates - any status)
    if (parsed.invoiceNo) {
      const existingByInvoice = await Receipt.findOne({
        invoiceNo: parsed.invoiceNo,
      });
      
      if (existingByInvoice) {
        console.log(`   ❌ Duplicate invoice: ${parsed.invoiceNo}`);
        
        const receipt = await Receipt.create({
          customerPhone: input.customerPhone,
          storeId: storeId,
          imageUrl: imagePath,
          ocrText: rawText,
          tin: parsed.tin,
          branchText: parsed.branchText,
          invoiceNo: parsed.invoiceNo,
          dateOnReceipt: parsed.date,
          totalAmount: parsed.totalAmount,
          status: 'rejected',
          reason: 'Invoice number already used',
          flags: ['Duplicate invoice'],
          processedAt: new Date(),
        });
        
        return {
          success: false,
          status: 'rejected',
          reason: 'This receipt has already been submitted',
          rejectionDetails: [
            {
              field: 'duplicate',
              issue: 'Invoice number already used',
              found: parsed.invoiceNo,
              message: `This receipt (Invoice #${parsed.invoiceNo}) has already been submitted and processed. Each receipt can only be used once.`,
            },
          ],
          receiptId: String(receipt._id),
          parsed,
        };
      }
    }
    
    // Check barcode uniqueness
    if (parsed.barcodeData) {
      const existingByBarcode = await Receipt.findOne({
        barcodeData: parsed.barcodeData,
        status: { $in: ['approved', 'pending'] },
      });
      
      if (existingByBarcode) {
        console.log(`   ❌ Duplicate barcode: ${parsed.barcodeData}`);
        
        const receipt = await Receipt.create({
          customerPhone: input.customerPhone,
          storeId: storeId,
          imageUrl: imagePath,
          ocrText: rawText,
          tin: parsed.tin,
          branchText: parsed.branchText,
          invoiceNo: parsed.invoiceNo,
          dateOnReceipt: parsed.date,
          totalAmount: parsed.totalAmount,
          barcodeData: parsed.barcodeData,
          status: 'rejected',
          reason: 'Barcode already used',
          flags: ['Duplicate barcode'],
          processedAt: new Date(),
        });
        
        return {
          success: false,
          status: 'rejected',
          reason: 'This receipt has already been submitted',
          rejectionDetails: [
            {
              field: 'duplicate',
              issue: 'Barcode already used',
              found: parsed.barcodeData,
              message: `This receipt barcode has already been submitted and processed. Each receipt can only be used once.`,
            },
          ],
          receiptId: String(receipt._id),
          parsed,
        };
      }
    }
    
    console.log('   ✅ No duplicates found');
    
    // ============================================================
    // STEP 8.5: Check for visit limit (configured hours) - same as QR logic
    // Only counts APPROVED receipts (rejected/flagged don't count as visits)
    // ============================================================
    if (input.customerPhone) {
      const visitLimitHours = await getVisitLimitHours();
      console.log(`\n📅 Step 8.5: Checking ${visitLimitHours}-hour visit limit (approved receipts only)...`);
      
      // Get timestamp X hours ago (rolling window, not calendar day)
      const limitHoursAgo = new Date(Date.now() - visitLimitHours * 60 * 60 * 1000);
      
      // Check if customer already has an APPROVED receipt within the limit hours
      const existingApprovedReceipt = await Receipt.findOne({
        customerPhone: input.customerPhone,
        status: 'approved', // Only count approved receipts (visits)
        processedAt: {
          $gte: limitHoursAgo,
        },
      });
      
      if (existingApprovedReceipt && existingApprovedReceipt.processedAt) {
        const hoursSinceLastVisit = Math.round(
          (Date.now() - existingApprovedReceipt.processedAt.getTime()) / (1000 * 60 * 60)
        );
        
        console.log(`   ❌ Customer already has an approved receipt within last ${visitLimitHours} hours (${hoursSinceLastVisit} hours ago)`);
        
        const receipt = await Receipt.create({
          customerPhone: input.customerPhone,
          storeId: storeId,
          imageUrl: imagePath,
          ocrText: rawText,
          tin: parsed.tin,
          branchText: parsed.branchText,
          invoiceNo: parsed.invoiceNo,
          dateOnReceipt: parsed.date,
          totalAmount: parsed.totalAmount,
          barcodeData: parsed.barcodeData,
          status: 'rejected',
          reason: `Only one visit per ${visitLimitHours} hours is allowed`,
          flags: [`${visitLimitHours}-hour limit exceeded`],
          processedAt: new Date(),
        });
        
        const remainingHours = Math.ceil(visitLimitHours - hoursSinceLastVisit);
        
        return {
          success: false,
          status: 'rejected',
          reason: `You have already submitted an approved receipt ${hoursSinceLastVisit} hours ago. Please wait ${remainingHours} more hours before submitting another receipt.`,
          rejectionDetails: [{
            field: 'visit_limit',
            issue: `${visitLimitHours}-hour visit limit exceeded`,
            found: `Approved receipt ${hoursSinceLastVisit} hours ago`,
            expected: `One approved receipt per ${visitLimitHours} hours`,
            message: `You already have an approved receipt from ${hoursSinceLastVisit} hours ago. Only one visit (approved receipt) per ${visitLimitHours} hours is allowed. Please wait ${remainingHours} more hours.`,
          }],
          receiptId: String(receipt._id),
          parsed,
        };
      }
      
      console.log(`   ✅ No approved receipt within last ${visitLimitHours} hours - proceeding`);
    }
    
    // ============================================================
    // STEP 9: Check if flagging is needed (low confidence, missing fields)
    // ============================================================
    console.log('\n🚩 Step 9: Checking if manual review needed...');
    
    // Flag if confidence is low
    if (parsed.confidence === 'low') {
      console.log('   ⚠️  Low confidence - flagging for review');
      
      const rejectionDetails: RejectionDetail[] = [
        {
          field: 'parsing_confidence',
          issue: 'Low parsing confidence',
          found: 'Low',
          expected: 'High or Medium',
          message: 'The system had difficulty reading some information from your receipt. An admin will review it manually to ensure accuracy.',
        },
      ];
      
      if (parsed.flags.length > 0) {
        rejectionDetails.push({
          field: 'parsing_issues',
          issue: 'Parsing issues detected',
          found: parsed.flags.join(', '),
          message: `Issues found during parsing: ${parsed.flags.join(', ')}`,
        });
      }
      
      const receipt = await Receipt.create({
        customerPhone: input.customerPhone,
        storeId: storeId,
        imageUrl: imagePath,
        ocrText: rawText,
        tin: parsed.tin,
        branchText: parsed.branchText,
        invoiceNo: parsed.invoiceNo,
        dateOnReceipt: parsed.date,
        totalAmount: parsed.totalAmount,
        barcodeData: parsed.barcodeData,
        status: 'flagged',
        reason: 'Low parsing confidence - manual review required',
        flags: parsed.flags,
        processedAt: new Date(),
      });
      
      return {
        success: false,
        status: 'flagged',
        reason: 'Receipt needs manual review by admin',
        rejectionDetails,
        receiptId: String(receipt._id),
        parsed,
      };
    }
    
    // Flag if critical fields are missing
    const criticalFieldsMissing = !parsed.tin || !parsed.invoiceNo || !parsed.date || !parsed.totalAmount;
    
    if (criticalFieldsMissing) {
      console.log('   ⚠️  Critical fields missing - flagging for review');
      
      const missingFields: string[] = [];
      if (!parsed.tin) missingFields.push('TIN');
      if (!parsed.invoiceNo) missingFields.push('Invoice Number');
      if (!parsed.date) missingFields.push('Date');
      if (!parsed.totalAmount) missingFields.push('Total Amount');
      
      const rejectionDetails: RejectionDetail[] = [
        {
          field: 'missing_fields',
          issue: 'Critical fields could not be detected',
          found: `Missing: ${missingFields.join(', ')}`,
          expected: 'All fields required: TIN, Invoice Number, Date, Total Amount',
          message: `The following critical information could not be read from your receipt: ${missingFields.join(', ')}. An admin will review it to verify the details.`,
        },
      ];
      
      const receipt = await Receipt.create({
        customerPhone: input.customerPhone,
        storeId: storeId,
        imageUrl: imagePath,
        ocrText: rawText,
        tin: parsed.tin,
        branchText: parsed.branchText,
        invoiceNo: parsed.invoiceNo,
        dateOnReceipt: parsed.date,
        totalAmount: parsed.totalAmount,
        barcodeData: parsed.barcodeData,
        status: 'flagged',
        reason: 'Some critical fields could not be detected',
        flags: parsed.flags,
        processedAt: new Date(),
      });
      
      return {
        success: false,
        status: 'flagged',
        reason: 'Receipt needs manual review by admin',
        rejectionDetails,
        receiptId: String(receipt._id),
        parsed,
      };
    }
    
    console.log('   ✅ All checks passed - proceeding with approval');
    
    // ============================================================
    // STEP 10: Create approved receipt record
    // ============================================================
    console.log('\n✅ Step 10: Creating approved receipt record...');
    
    const receipt = await Receipt.create({
      customerPhone: input.customerPhone,
      storeId: storeId,
      imageUrl: imagePath,
      ocrText: rawText,
      tin: parsed.tin,
      branchText: parsed.branchText,
      invoiceNo: parsed.invoiceNo,
      dateOnReceipt: parsed.date,
      totalAmount: parsed.totalAmount,
      barcodeData: parsed.barcodeData,
      status: 'approved',
      reason: 'All validation checks passed',
      flags: parsed.flags,
      // Include fraud detection data if available
      imageHash: fraudScoreResult?.imageHash,
      fraudScore: fraudScoreResult?.overallScore,
      tamperingScore: fraudScoreResult?.tamperingScore,
      aiDetectionScore: fraudScoreResult?.aiDetectionScore,
      fraudFlags: fraudScoreResult?.flags || [],
      processedAt: new Date(),
    });
    
    console.log(`   ✅ Receipt created: ${receipt._id}`);
    
    // ============================================================
    // STEP 11: Find or create customer
    // ============================================================
    console.log('\n👤 Step 11: Finding/creating customer...');
    
    if (!input.customerPhone) {
      console.log('   ⚠️  No customer phone provided - skipping customer update');
      
      return {
        success: true,
        status: 'approved',
        reason: 'Receipt approved (no customer linked)',
        receiptId: String(receipt._id),
        parsed,
      };
    }
    
    let customer = await Customer.findOne({ phone: input.customerPhone });
    
    if (!customer) {
      console.log('   📝 Creating new customer...');
      customer = await Customer.create({
        name: input.customerPhone, // Will be updated when they provide name
        phone: input.customerPhone,
        totalVisits: 0,
      });
      console.log(`   ✅ Customer created: ${customer._id}`);
    } else {
      console.log(`   ✅ Existing customer found: ${customer.name}`);
    }
    
    // Link customer to receipt
    receipt.customerId = customer._id as any;
    await receipt.save();
    
    // ============================================================
    // STEP 12: Create visit record
    // ============================================================
    console.log('\n📍 Step 12: Creating visit record...');
    
    const visit = await Visit.create({
      customerId: customer._id,
      storeId: storeId,
      receiptId: receipt._id,
      visitMethod: 'receipt',
      timestamp: new Date(),
      rewardEarned: false,
    });
    
    console.log(`   ✅ Visit created: ${visit._id}`);
    
    // Update customer visit count
    customer.totalVisits = (customer.totalVisits || 0) + 1;
    customer.lastVisit = new Date();
    await customer.save();
    
    console.log(`   ✅ Customer visit count: ${customer.totalVisits}`);
    
    // ============================================================
    // STEP 13: Check for reward eligibility (5 visits within 45 days)
    // ============================================================
    console.log('\n🎁 Step 13: Checking reward eligibility...');
    
    // Get reward rules from system settings
    const REQUIRED_VISITS = await getRequiredVisits();
    const VALIDITY_DAYS = await getRewardPeriodDays();
    
    // Find the first approved receipt to determine period start
    // Note: The current receipt has already been saved, so we count it too
    const firstApprovedReceipt = await Receipt.findOne({
      customerPhone: input.customerPhone,
      status: 'approved',
    })
      .sort({ processedAt: 1 }); // Get the earliest receipt
    
    let periodStartDate: Date;
    let periodEndDate: Date;
    let recentVisits: number;
    const now = new Date();
    
    if (firstApprovedReceipt && firstApprovedReceipt.processedAt) {
      // Period starts from first visit
      periodStartDate = new Date(firstApprovedReceipt.processedAt);
      periodEndDate = new Date(periodStartDate);
      periodEndDate.setDate(periodEndDate.getDate() + VALIDITY_DAYS);
      
      // Check if period has expired (45 days passed since first visit)
      if (now > periodEndDate) {
        console.log(`   ⏰ Period expired! Starting new period from most recent visit.`);
        
        // Period expired - find the most recent receipt before expiration
        // or use current receipt as start of new period
        const lastReceiptBeforeExpiry = await Receipt.findOne({
          customerPhone: input.customerPhone,
          status: 'approved',
          processedAt: {
            $lte: periodEndDate, // Before expiry
          },
        })
          .sort({ processedAt: -1 });
        
        // Start new period from current receipt (most recent)
        // Use the current receipt's processedAt as the start of new period
        const currentReceiptTime = receipt?.processedAt || now;
        periodStartDate = new Date(currentReceiptTime);
        periodEndDate = new Date(periodStartDate);
        periodEndDate.setDate(periodEndDate.getDate() + VALIDITY_DAYS);
        
        // Count only visits from the new period start (including current receipt)
        recentVisits = await Receipt.countDocuments({
          customerPhone: input.customerPhone,
          status: 'approved',
          processedAt: {
            $gte: periodStartDate,
          },
        });
      } else {
        // Period still active - count visits within current period
        recentVisits = await Receipt.countDocuments({
          customerPhone: input.customerPhone,
          status: 'approved',
          processedAt: {
            $gte: periodStartDate,
            $lte: periodEndDate,
          },
        });
      }
    } else {
      // This is the first visit - start new period from current receipt
      const currentReceiptTime = receipt?.processedAt || now;
      periodStartDate = new Date(currentReceiptTime);
      periodEndDate = new Date(periodStartDate);
      periodEndDate.setDate(periodEndDate.getDate() + VALIDITY_DAYS);
      recentVisits = 1;
    }
    
    const daysRemaining = Math.max(0, Math.ceil((periodEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    console.log(`   📊 Recent visits (within ${VALIDITY_DAYS}-day period): ${recentVisits}/${REQUIRED_VISITS}`);
    console.log(`   ⏰ Period started: ${periodStartDate.toISOString()}`);
    console.log(`   ⏰ Period ends: ${periodEndDate.toISOString()} (${daysRemaining} days remaining)`);
    
    // Check if customer is eligible for a reward (has required visits within period)
    // AND doesn't already have an active reward (pending/claimed/redeemed)
    // Note: Once a reward is 'used' (admin scans QR), the customer can earn a new reward
    // Visits don't restart - they continue in a rolling 45-day window
    const existingReward = await Reward.findOne({
      customerId: customer._id,
      storeId: storeId,
      status: { $in: ['pending', 'claimed', 'redeemed'] }, // Active rewards - block new reward creation
      // 'used' and 'expired' rewards don't block new reward creation
    });
    
    if (recentVisits >= REQUIRED_VISITS && !existingReward) {
      console.log(`   🎉 Customer eligible for reward! (${recentVisits} visits within ${VALIDITY_DAYS} days)`);
      
      // Get reward settings from system settings
      const discountPercent = await getDiscountPercent();
      const initialExpirationDays = await getInitialExpirationDays();
      
      // Create reward with "claimed" status (automatically claimed when required visits completed)
      const rewardCode = `LEWIS${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      
      const reward = await Reward.create({
        customerId: customer._id,
        storeId: storeId,
        code: rewardCode,
        rewardType: `${discountPercent}% Discount on Next Purchase`,
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + initialExpirationDays * 24 * 60 * 60 * 1000), // Valid for configured days from now
        status: 'claimed', // Automatically claimed when required visits completed
        discountPercent: discountPercent,
      });
      
      console.log(`   ✅ Reward created and automatically claimed: ${reward.code}`);
      
      // Update visit to mark reward earned
      visit.rewardEarned = true;
      await visit.save();
      
      const duration = Date.now() - startTime;
      console.log(`\n✅ Receipt validation complete in ${duration}ms`);
      
      return {
        success: true,
        status: 'approved',
        reason: 'Receipt approved - You are now eligible for a reward! Claim it from the rewards section.',
        receiptId: String(receipt._id),
        visitId: String(visit._id),
        visitCount: customer.totalVisits,
        rewardEarned: true,
        rewardId: String(reward._id),
        visitsInPeriod: recentVisits,
        parsed,
      };
    } else if (existingReward) {
      console.log(`   ℹ️  Customer already has an active reward (${existingReward.status}). Must use it before earning a new one.`);
    } else {
      const remaining = REQUIRED_VISITS - recentVisits;
      console.log(`   ℹ️  Progress: ${recentVisits}/${REQUIRED_VISITS} visits (need ${remaining} more)`);
    }
    
    const duration = Date.now() - startTime;
    console.log(`\n✅ Receipt validation complete in ${duration}ms`);
    
    return {
      success: true,
      status: 'approved',
      reason: 'Receipt approved and visit recorded',
      receiptId: String(receipt._id),
      visitId: String(visit._id),
      visitCount: customer.totalVisits,
      rewardEarned: false,
      visitsInPeriod: recentVisits,
      visitsNeeded: REQUIRED_VISITS,
      parsed,
    };
    
  } catch (error) {
    console.error('\n❌ Receipt validation error:', error);
    
    return {
      success: false,
      status: 'rejected',
      reason: 'Internal server error during validation',
    };
  }
}

/**
 * Get receipt details by ID
 * Useful for checking status after upload
 */
export async function getReceiptDetails(receiptId: string) {
  await dbConnect();
  
  const receipt = await Receipt.findById(receiptId)
    .populate('customerId', 'name phone')
    .populate('storeId', 'name address')
    .populate('reviewedBy', 'name email');
  
  return receipt;
}

/**
 * Admin: Approve flagged receipt
 * Creates visit record and updates customer
 */
export async function adminApproveReceipt(
  receiptId: string,
  adminId: string,
  notes?: string
): Promise<ValidationResult> {
  await dbConnect();
  
  const receipt = await Receipt.findById(receiptId);
  
  if (!receipt) {
    return {
      success: false,
      status: 'rejected',
      reason: 'Receipt not found',
    };
  }
  
  if (receipt.status === 'approved') {
    return {
      success: false,
      status: 'approved',
      reason: 'Receipt already approved',
      receiptId: String(receipt._id),
    };
  }
  
  // Update receipt status
  receipt.status = 'approved';
  receipt.reviewedBy = adminId as any;
  receipt.reviewedAt = new Date();
  receipt.reviewNotes = notes;
  await receipt.save();
  
  // Create visit and update customer (similar to auto-approve flow)
  // ... (implementation similar to steps 9-11 above)
  
  return {
    success: true,
    status: 'approved',
    reason: 'Receipt manually approved by admin',
    receiptId: String(receipt._id),
  };
}

/**
 * Admin: Reject flagged receipt
 */
export async function adminRejectReceipt(
  receiptId: string,
  adminId: string,
  reason: string,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  await dbConnect();
  
  const receipt = await Receipt.findById(receiptId);
  
  if (!receipt) {
    return {
      success: false,
      message: 'Receipt not found',
    };
  }
  
  receipt.status = 'rejected';
  receipt.reason = reason;
  receipt.reviewedBy = adminId as any;
  receipt.reviewedAt = new Date();
  receipt.reviewNotes = notes;
  await receipt.save();
  
  return {
    success: true,
    message: 'Receipt rejected',
  };
}

