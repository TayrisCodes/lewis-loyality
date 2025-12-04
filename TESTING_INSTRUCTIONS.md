# Receipt Upload System - Testing Instructions

**Quick Start Guide for Testing Phase 6**

---

## Option 1: Browser Testing (Recommended)

### Prerequisites
```bash
# 1. Make sure MongoDB Atlas is accessible
# 2. Start the dev server
cd /root/lewis-loyality
npm run dev
```

### Test Steps

**Step 1**: Get a Store ID
```bash
# In browser, open:
http://localhost:3000/api/store

# Copy any store's _id
# Example: "507f1f77bcf86cd799439011"
```

**Step 2**: Navigate to Receipt Upload
```
http://localhost:3000/customer-receipt?storeId=YOUR_STORE_ID&phone=+251911234567
```

**Step 3**: Upload Receipt
- Click "Take Photo" or "Choose File"
- Select any image (or create test receipt)
- Click "Upload Receipt"
- Wait 2-3 seconds
- See result!

**Expected Results**:
- ✅ If image has Lewis text + today's date + amount: APPROVED
- ❌ If missing required fields: REJECTED
- ⚠️ If unclear/blurry: FLAGGED

---

## Option 2: API Testing (curl)

### Create Test Receipt Image

Create a simple text file that looks like a receipt:
```bash
cat > test-receipt.txt << 'EOF'
LEWIS RETAIL
Lewis Coffee - Bole
123 Bole Road

TIN: 0003169685
Date: 2024-11-12
Invoice No: TEST-001

TOTAL: 550.00 ETB
EOF
```

### Test Upload API

```bash
# Get store ID first
curl http://localhost:3000/api/store | jq -r '.stores[0]._id'

# Set store ID
STORE_ID="YOUR_STORE_ID_HERE"

# Upload (note: this will likely be flagged since it's a text file, not an image)
curl -X POST http://localhost:3000/api/receipts/upload \
  -F "file=@test-receipt.txt" \
  -F "storeId=$STORE_ID" \
  -F "phone=+251911234567" \
  | jq .
```

---

## Option 3: Simple Integration Test

### Test Components Individually

**Test 1: Storage**
```bash
cd /root/lewis-loyality

# Create test file
echo "test" > /tmp/test-image.jpg

# Test storage functions
node -e "
const { saveReceiptImage } = require('./lib/storage.ts');
const fs = require('fs');
const buffer = fs.readFileSync('/tmp/test-image.jpg');
saveReceiptImage(buffer, 'test-store', 'test.jpg')
  .then(path => console.log('Saved:', path))
  .catch(err => console.error('Error:', err));
"
```

**Test 2: OCR (with real image)**
```bash
# Requires actual image file
node -e "
const { extractTextFromImage } = require('./lib/ocr.ts');
extractTextFromImage('./path/to/receipt.jpg')
  .then(text => console.log('Extracted:', text))
  .catch(err => console.error('Error:', err));
"
```

**Test 3: Parser**
```bash
node -e "
const { parseReceiptText } = require('./lib/receiptParser.ts');
const text = 'LEWIS RETAIL\nTIN: 0003169685\nDate: 2024-11-12\nTOTAL: 550.00';
const parsed = parseReceiptText(text);
console.log('Parsed:', JSON.stringify(parsed, null, 2));
"
```

---

## Creating a Real Test Receipt

### Method 1: Use Real Receipt

If you have a Lewis Retail receipt:
1. Take photo with phone
2. Transfer to computer
3. Upload via browser or curl

### Method 2: Generate Mock Receipt

**Using Word/Google Docs**:
```
LEWIS RETAIL
Lewis Coffee - Bole
123 Bole Road, Addis Ababa

TIN: 0003169685
Date: 2024-11-12
Invoice No: 04472-002-0011L

Cappuccino           250.00
Croissant            150.00
Water                 50.00

SUBTOTAL             450.00
TAX (15%)             67.50
TOTAL                517.50

Thank you for your visit!
```

Save as image (screenshot or export as JPG)

### Method 3: Use Online Receipt Generator

1. Search "receipt generator online"
2. Fill in Lewis Retail details
3. Download as image
4. Use for testing

---

## What to Test

### ✅ Success Scenarios

**Test 1: Valid Receipt**
- TIN: 0003169685
- Date: Today
- Amount: 550 ETB (above 500 minimum)
- Expected: ✅ APPROVED

**Test 2: Reward Threshold**
- Upload 5 receipts for same customer
- Expected: 5th upload shows "🎁 Reward earned!"

### ❌ Rejection Scenarios

**Test 3: Low Amount**
- Amount: 450 ETB (below 500 minimum)
- Expected: ❌ REJECTED ("Amount below minimum")

**Test 4: Old Date**
- Date: 2024-11-10 (2 days ago)
- Expected: ❌ REJECTED ("Receipt expired")

**Test 5: Wrong TIN**
- TIN: 9999999999
- Expected: ❌ REJECTED ("Wrong store")

**Test 6: Duplicate Invoice**
- Upload same receipt twice
- Expected: 1st ✅ APPROVED, 2nd ❌ REJECTED ("Already used")

### ⚠️ Flagging Scenarios

**Test 7: Blurry Image**
- Use out-of-focus photo
- Expected: ⚠️ FLAGGED ("Low confidence")

**Test 8: Partial Text**
- Photo cuts off part of receipt
- Expected: ⚠️ FLAGGED ("Missing fields")

---

## Troubleshooting

### Server Not Running

```bash
Error: ECONNREFUSED localhost:3000

Solution:
cd /root/lewis-loyality
npm run dev
```

### MongoDB Connection Error

```bash
Error: MongoServerError: Authentication failed

Solution:
Check .env.local has correct MONGODB_URI
```

### OCR Taking Too Long

```bash
Processing receipt... (>10 seconds)

Possible causes:
- Large image file (>8MB)
- Server under load
- First OCR (worker initialization)

Solution:
- Reduce image size
- Wait for first request to complete
- Subsequent requests will be faster
```

### "Receipt Not Found" Error

```bash
Check status endpoint returns 404

Possible causes:
- Receipt ID incorrect
- Database connection issue

Solution:
- Verify receipt ID from upload response
- Check MongoDB Atlas connection
```

---

## Performance Expectations

### Development (Local)

```
First upload:     ~3-5 seconds (OCR worker init)
Subsequent:       ~2-3 seconds
OCR processing:   ~2 seconds (80% of time)
Database ops:     ~300ms
Storage ops:      ~100ms
```

### Production (Optimized)

```
With cloud OCR:   ~1-2 seconds
With caching:     ~500ms (if cached)
With CDN:         Instant image serving
```

---

## Next Steps

### Continue Development

**Phase 7**: Admin Dashboard (5-6 hours)
- Receipt review interface
- Approve/reject UI
- Statistics dashboard

**Phase 8**: Settings Management (2-3 hours)
- Store configuration UI
- Rule management
- Enable/disable controls

**Phase 9**: Testing (3-4 hours)
- End-to-end tests
- Security testing
- Performance testing

**Phase 10**: Deployment (2-3 hours)
- Production build
- Environment config
- Launch checklist

### Production Launch

**Before going live**:
1. Complete Phases 7-10
2. Test with real receipts
3. Train admins on review process
4. Set up monitoring
5. Prepare customer communication
6. Gradual rollout (one store first)

---

## Questions?

**Need help with**:
- Setting up test environment?
- Understanding any component?
- Debugging issues?
- Planning next phases?

**Just ask!** We're here to help. 🚀

---

**Status**: Phase 6 Complete ✅  
**Next**: Phase 7 (Admin Dashboard) or Testing  
**Progress**: 60% Complete

