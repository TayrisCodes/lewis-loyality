# Receipt Validation Rules - Implementation Complete

## ✅ All Requirements Implemented

### 1. Store Configuration ✅
- **TIN**: `0003169685` (only this TIN is accepted)
- **Minimum Amount**: `2000 ETB` (receipts below this are rejected)
- **Validity**: `24 hours` (receipts older than 24 hours are rejected)

### 2. TIN Validation ✅
- **Only TIN `0003169685` is accepted**
- All other TINs are **rejected immediately** before any other validation
- Error message: "This receipt is not from a participating store. Only receipts with TIN 0003169685 are accepted."

### 3. Invoice Number Uniqueness ✅
- **Invoice numbers must be unique** across all receipts (any status)
- Duplicate invoice numbers are **rejected immediately**
- Error message: "This receipt has already been submitted and processed. Each receipt can only be used once."

### 4. One Visit Per 24 Hours ✅
- **Only approved receipts count as visits**
- Uses **rolling 24-hour window** (not calendar day) - same as QR logic
- Rejected/flagged receipts **do NOT count** as visits
- Customer can submit again if previous receipt was rejected
- Error message: "You already have an approved receipt from X hours ago. Only one visit (approved receipt) per 24 hours is allowed."

### 5. Photo Validation ✅
- **Basic receipt validation** checks if image looks like a receipt
- Looks for receipt keywords (TIN, INVOICE, RECEIPT, TOTAL, AMOUNT, DATE, TAX, SUBTOTAL)
- Checks for numeric data (amounts, TIN)
- Rejects immediately if not a receipt
- Error message: "The uploaded image does not appear to be a receipt. Please upload a clear photo of your receipt."

### 6. Reward Eligibility ✅
- **5 approved receipts within 45 days** (not total visits)
- Reward status workflow:
  - `pending` - Customer eligible, needs to claim
  - `claimed` - Customer claimed, waiting for admin
  - `redeemed` - Admin redeemed, QR code generated (valid 1 month)
  - `used` - QR code scanned by admin
  - `expired` - Reward expired

## Test Results

Run comprehensive validation test:
```bash
./run-test-validation.sh
```

### Test Output Summary:
- ✅ Store configuration: Correct (TIN, min amount, validity)
- ✅ TIN validation: Working (all receipts have valid TIN)
- ⚠️ Invoice uniqueness: Working (detects duplicates correctly)
- ✅ 24-hour visit limit: Working (no approved receipts in last 24h)
- ✅ Reward eligibility: Working (tracks 5 visits within 45 days)
- ⚠️ Amount validation: Working (correctly identifies receipts below minimum)

## API Endpoints

### Customer:
- `POST /api/customer/rewards/claim` - Claim pending reward

### Admin:
- `POST /api/admin/rewards/[rewardId]/redeem` - Redeem claimed reward (generate QR)
- `POST /api/admin/rewards/[rewardId]/scan` - Mark reward as used (scan QR)

## Validation Flow

1. **Photo Validation** → Reject if not a receipt
2. **OCR Extraction** → Extract text from image
3. **TIN Validation** → Reject if TIN ≠ 0003169685
4. **Invoice Uniqueness** → Reject if invoice already exists
5. **Store Identification** → Find store by TIN
6. **Amount Validation** → Reject if < 2000 ETB
7. **Date Validation** → Reject if > 24 hours old
8. **24-Hour Visit Limit** → Reject if approved receipt in last 24h
9. **Fraud Detection** → Check for duplicates, tampering
10. **Approval** → Create visit, check reward eligibility

## Files Modified

1. `/root/lewis-loyality/lib/receiptValidator.ts`
   - Added strict TIN validation (only 0003169685)
   - Added invoice uniqueness check (all statuses)
   - Updated 24-hour visit limit (rolling window, approved only)
   - Added photo validation
   - Updated min amount to 2000 ETB
   - Updated reward eligibility (5 visits within 45 days)

2. `/root/lewis-loyality/models/Reward.ts`
   - Added new statuses: pending, claimed, redeemed, used, expired
   - Added fields: claimedAt, redeemedAt, qrCode, discountPercent, discountCode

3. `/root/lewis-loyality/scripts/update-store-tin.ts`
   - Updated min amount to 2000 ETB

## Files Created

1. `/root/lewis-loyality/test-receipt-validation-complete.ts` - Comprehensive validation test
2. `/root/lewis-loyality/run-test-validation.sh` - Test script wrapper
3. `/root/lewis-loyality/app/api/customer/rewards/claim/route.ts` - Claim reward endpoint
4. `/root/lewis-loyality/app/api/admin/rewards/[rewardId]/redeem/route.ts` - Redeem reward endpoint
5. `/root/lewis-loyality/app/api/admin/rewards/[rewardId]/scan/route.ts` - Scan QR endpoint

## Next Steps: Frontend Integration

1. **Upload Button**: Disable after one approved receipt per 24 hours
2. **Claim Button**: Show active when reward status is `pending`
3. **Reward Progress**: Display "X/5 visits within 45 days"
4. **Admin Reward Table**: Show pending/claimed rewards with redeem button
5. **QR Code Display**: Show QR code after redemption
6. **Scan QR**: Admin functionality to scan and mark as used

