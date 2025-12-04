# Reward System Update Summary

## Overview
Updated the receipt validation and reward system according to the new requirements.

## Key Changes Implemented

### 1. TIN Validation (Strict)
- **Only TIN `0003169685` is accepted** - all other TINs are rejected immediately
- Updated validation logic in `lib/receiptValidator.ts` to check TIN early in the process
- Rejects receipts with invalid TIN before proceeding with other validations

### 2. Minimum Amount
- **Updated minimum receipt amount to 2000 ETB** (from 50 ETB)
- Updated store configuration script to set `minReceiptAmount: 2000`
- Validation enforced in receipt validator

### 3. Receipt Validity
- **24 hours validity** maintained (unchanged)
- Receipts older than 24 hours are rejected

### 4. Photo Validation
- **Basic receipt validation** added - rejects images that don't appear to be receipts
- Checks for receipt keywords (TIN, INVOICE, RECEIPT, TOTAL, AMOUNT, DATE, TAX, SUBTOTAL)
- Checks for numeric data that looks like amounts or TIN
- Rejects immediately if image doesn't look like a receipt

### 5. One Receipt Per Day Limit
- **Only one approved receipt per day per customer**
- Checks for existing approved receipts within the current day (00:00 to 23:59)
- Rejects additional receipts if customer already submitted one today
- Upload button should be disabled after one acceptance (frontend implementation needed)

### 6. Reward Eligibility Logic
- **5 visits within 45 days** (changed from total visits modulo)
- Tracks approved receipts within the last 45 days
- Reward status workflow:
  - `pending` - Customer has 5 visits, needs to claim
  - `claimed` - Customer clicked claim button, waiting for admin
  - `redeemed` - Admin redeemed, QR code generated (valid 1 month)
  - `used` - QR code scanned by admin
  - `expired` - Reward expired

### 7. Reward Model Updates
- Added new statuses: `pending`, `claimed`, `redeemed`, `used`, `expired`
- Added fields:
  - `claimedAt` - When customer claimed the reward
  - `redeemedAt` - When admin redeemed and generated QR
  - `usedAt` - When admin scanned QR code
  - `qrCode` - QR code data (JSON string)
  - `discountPercent` - Discount percentage (default: 10%)
  - `discountCode` - Unique discount code
- Updated `expiresAt` to be 1 month from redemption (not 45 days)

### 8. API Endpoints Created

#### Customer Endpoints:
- **POST `/api/customer/rewards/claim`** - Customer claims a pending reward
  - Changes status from `pending` to `claimed`
  - Requires: `phone`, `rewardId`

#### Admin Endpoints:
- **POST `/api/admin/rewards/[rewardId]/redeem`** - Admin redeems a claimed reward
  - Changes status from `claimed` to `redeemed`
  - Generates QR code and discount code
  - Sets 1 month expiry from redemption
  - Requires: Admin authentication

- **POST `/api/admin/rewards/[rewardId]/scan`** - Admin scans QR to mark as used
  - Changes status from `redeemed` to `used`
  - Marks reward as history
  - Requires: Admin authentication

### 9. Store Configuration
- Updated `scripts/update-store-tin.ts`:
  - TIN: `0003169685`
  - Min Amount: `2000 ETB`
  - Validity: `24 hours`

## Reward Flow

1. **Customer uploads receipt** → Validated → Approved
2. **Visit counted** (one per day limit enforced)
3. **After 5 approved receipts within 45 days**:
   - Reward created with status `pending`
   - Customer sees "Claim" button (becomes active/touchable)
4. **Customer clicks "Claim"**:
   - Status changes to `claimed`
   - Reward appears in admin reward table
5. **Admin clicks "Redeem"**:
   - Status changes to `redeemed`
   - QR code generated (10% discount, valid 1 month)
   - Customer can use QR code for discount
6. **Admin scans QR code**:
   - Status changes to `used`
   - Reward becomes history
   - "Claim" button goes back to static/un touchable until customer earns another reward

## Frontend Integration Needed

### Customer Side:
1. Check if customer has pending reward → Show active "Claim" button
2. Call `/api/customer/rewards/claim` when button clicked
3. Disable upload button after one approved receipt per day
4. Show reward progress (X/5 visits within 45 days)
5. Display QR code when reward is redeemed
6. Show reward history

### Admin Side:
1. Display rewards table with `pending` and `claimed` rewards
2. Show "Redeem" button for `claimed` rewards
3. Display QR code after redemption
4. Scan QR code functionality (or manual "Mark as Used" button)

## Files Modified

1. `/root/lewis-loyality/lib/receiptValidator.ts`
   - Added TIN validation (only 0003169685)
   - Added photo validation
   - Added one-per-day check
   - Updated min amount to 2000
   - Updated reward eligibility logic (5 visits within 45 days)

2. `/root/lewis-loyality/models/Reward.ts`
   - Added new statuses and fields

3. `/root/lewis-loyality/scripts/update-store-tin.ts`
   - Updated min amount to 2000

## Files Created

1. `/root/lewis-loyality/app/api/customer/rewards/claim/route.ts`
2. `/root/lewis-loyality/app/api/admin/rewards/[rewardId]/redeem/route.ts`
3. `/root/lewis-loyality/app/api/admin/rewards/[rewardId]/scan/route.ts`

## Testing Checklist

- [ ] Test TIN validation (reject other TINs)
- [ ] Test minimum amount validation (reject < 2000 ETB)
- [ ] Test 24-hour validity
- [ ] Test photo validation (reject non-receipt images)
- [ ] Test one-per-day limit
- [ ] Test reward eligibility (5 visits within 45 days)
- [ ] Test claim reward API
- [ ] Test redeem reward API
- [ ] Test scan/use reward API

