# 🧪 Realistic End-to-End Test: Receipt Upload → Rewards

## Overview

This test simulates the complete flow from receipt photo upload to reward earning:

1. **Receipt Upload** → Customer uploads receipt photo
2. **OCR Extraction** → PaddleOCR extracts text from image
3. **Receipt Parsing** → Extract TIN, Invoice, Date, Amount, Branch
4. **Store Validation** → Verify store exists and is active
5. **Receipt Validation** → Check amount, date, TIN match store rules
6. **Fraud Detection** → Check for duplicates, tampering, AI-generated images
7. **Visit Recording** → Create visit record and update customer
8. **Reward Check** → Check if customer qualifies for reward

## Test Scripts

### Option 1: Direct Test (Recommended)
Calls validation function directly - faster and more reliable:

```bash
# Test without storeId (will identify from receipt TIN)
npx tsx test-receipt-direct.ts uploads/receipts/unknown/photo_2025-11-26_11-44-49.jpg

# Test with specific storeId
npx tsx test-receipt-direct.ts uploads/receipts/unknown/photo_2025-11-26_11-44-49.jpg <storeId>
```

**Note:** Requires MongoDB connection (set MONGODB_URI in .env)

### Option 2: HTTP API Test
Tests through HTTP API endpoint:

```bash
# Make sure server is running first
npm run dev

# Then run test
npx tsx test-receipt-to-rewards.ts uploads/receipts/unknown/photo_2025-11-26_11-44-49.jpg [storeId]
```

## Test Configuration

- **Customer Phone**: `0936308836` (hardcoded in test script)
- **Receipt Image**: `uploads/receipts/unknown/photo_2025-11-26_11-44-49.jpg`
- **Store ID**: Optional - will be identified from receipt TIN if not provided

## Expected Output

### ✅ Approved Receipt

```
✅ RECEIPT APPROVED!
📄 Receipt ID: 67890abc...
📍 Visit ID: 12345def...
🔢 Total Visits: 5

✅ Visit recorded successfully
📊 Progress: 5 visit(s) recorded

💬 Message: Receipt approved and visit recorded
```

### 🎉 Reward Earned

```
✅ RECEIPT APPROVED!
📄 Receipt ID: 67890abc...
📍 Visit ID: 12345def...
🔢 Total Visits: 10

🎉🎉🎉 REWARD EARNED! 🎉🎉🎉
🎁 Reward ID: 98765xyz...
📱 Customer: 0936308836
✅ Visit Count: 10 (qualifies for reward)

💬 Message: 🎉 Receipt approved - Reward earned!
```

### ❌ Rejected Receipt

```
❌ RECEIPT REJECTED
📄 Receipt ID: 67890abc...

💬 Main Reason: Amount 450 is below minimum 500

📋 DETAILED REJECTION REASONS:
1. Field: amount
   Issue: Amount below minimum requirement
   Found: 450
   Expected: 500
   Message: Receipt amount of 450 ETB is below the minimum required amount of 500 ETB.

❌ VISIT POINT NOT RECEIVED
Reason: Amount 450 is below minimum 500

Detailed explanation:
  • Receipt amount of 450 ETB is below the minimum required amount of 500 ETB.
```

### ⚠️ Flagged Receipt

```
⚠️  RECEIPT FLAGGED FOR MANUAL REVIEW
📄 Receipt ID: 67890abc...

💬 Reason: Receipt needs manual review by admin

📋 DETAILED REVIEW REASONS:
1. Field: parsing_confidence
   Issue: Low parsing confidence
   Found: Low
   Expected: High or Medium
   Message: The system had difficulty reading some information from your receipt. An admin will review it manually to ensure accuracy.

⏳ VISIT POINT PENDING REVIEW
Your receipt has been submitted but needs admin review.
An admin will verify the receipt and approve/reject it.
Receipt ID: 67890abc...
```

## Rejection Reasons Explained

The test will show **exactly why** a receipt was rejected or flagged:

### Amount Issues
- **Below minimum**: Receipt amount is less than store's minimum requirement
- **No amount found**: Could not extract total amount from receipt

### Date Issues
- **Too old**: Receipt is older than store's validity period (default: 24 hours)
- **Future date**: Receipt date is in the future (invalid)

### Store Issues
- **TIN mismatch**: Receipt TIN doesn't match store's TIN
- **Store not found**: Store with this TIN is not registered
- **Store not active**: Store exists but is disabled

### Duplicate Issues
- **Invoice already used**: This invoice number was already submitted
- **Barcode already used**: This receipt barcode was already used

### Fraud Issues
- **High fraud score**: Receipt shows signs of fraud (score > 70)
- **Image tampering**: Receipt image appears to be modified
- **AI-generated**: Receipt may be artificially created

### Quality Issues
- **Low OCR confidence**: Image too blurry or unclear
- **Missing fields**: Critical fields (TIN, Invoice, Date, Amount) not found

## Running the Test

1. **Ensure MongoDB is connected**:
   ```bash
   # Check .env file has MONGODB_URI
   grep MONGODB_URI .env
   ```

2. **Ensure PaddleOCR is running**:
   ```bash
   docker ps | grep paddleocr
   ```

3. **Run the test**:
   ```bash
   npx tsx test-receipt-direct.ts uploads/receipts/unknown/photo_2025-11-26_11-44-49.jpg
   ```

## Test Results Interpretation

- **Exit code 0**: Receipt approved (visit recorded, maybe reward earned)
- **Exit code 1**: Receipt rejected or flagged (no visit point received)

## Notes

- The test uses phone number `0936308836` as specified
- If storeId is not provided, the system will try to identify the store from the receipt TIN
- All rejection reasons are explained in detail for transparency
- The test shows exactly which validation rules failed and why


