# 🔍 OCR Performance Investigation & Complete Flow Analysis

**Issue**: PaddleOCR taking 2 minutes instead of expected 5-7 seconds  
**Date**: December 2024  
**Priority**: High

---

## 📊 Current OCR Pipeline Architecture

### OCR Priority Chain

```
1. PaddleOCR (Primary)
   ├─ Expected: 5-7 seconds
   ├─ Timeout: 45 seconds (45000ms)
   ├─ URL: http://paddleocr:8866 or http://localhost:8866
   └─ Endpoint: /predict/ocr_system

2. N8N AI OCR (Fallback 1)
   ├─ Expected: 2-4 seconds
   ├─ Timeout: 8 seconds
   ├─ URL: From N8N_OCR_WEBHOOK_URL env var
   └─ Status: Optional (if configured)

3. Tesseract.js (Fallback 2)
   ├─ Expected: 30-90 seconds
   ├─ Timeout: 15 seconds (hard limit)
   ├─ Location: Client-side Node.js
   └─ Status: Always available (last resort)
```

---

## 🐛 Problem Analysis: Why PaddleOCR Takes 2 Minutes

### Potential Causes

#### 1. **PaddleOCR Service Not Running**
```bash
# Check if PaddleOCR container is running
docker ps | grep paddleocr

# Check if service is accessible
curl http://localhost:8866/health
curl http://paddleocr:8866/health
```

**Impact**: 
- Request hangs until timeout (45 seconds)
- Then falls back to N8N (8 seconds timeout)
- Then falls back to Tesseract (15 seconds)
- **Total: ~68+ seconds, could reach 2 minutes if Tesseract runs full duration**

#### 2. **Network Latency/Connection Issues**
- If PaddleOCR is on remote server
- Docker networking issues
- DNS resolution delays

**Check**:
```bash
# Test connection speed
time curl -X POST http://localhost:8866/predict/ocr_system \
  -H "Content-Type: application/json" \
  -d '{"images":[""]}'
```

#### 3. **Large Image Size**
- Current code optimizes images BEFORE PaddleOCR
- But if optimization is slow, overall time increases
- Image optimization: `resizeImageForOCR()` reduces to max 1000px width

**Check**: Image size in logs
```
📸 Starting OCR from buffer (XXX KB)
📐 Optimizing image: ...
```

#### 4. **PaddleOCR Processing Slow Images**
- Complex receipts with lots of text
- Poor image quality
- Multiple text boxes

**Current timeout**: 45 seconds (may not be enough for complex images)

#### 5. **No Image Optimization Before PaddleOCR**
Looking at code in `ocr.ts`:
```typescript
// Line 296: Optimize image BEFORE PaddleOCR
const optimizedForPaddle = await resizeImageForOCR(imageBuffer, 1000);
```

**This should help**, but if optimization itself is slow...

#### 6. **Fallback Chain Taking Full Time**
If PaddleOCR fails → N8N fails → Tesseract runs for full 15 seconds:
- 45s (PaddleOCR timeout) + 8s (N8N timeout) + 15s (Tesseract) = **68 seconds minimum**
- Plus processing overhead = **Could reach 2 minutes**

---

## 🔍 Investigation Steps

### Step 1: Check PaddleOCR Service Status

```bash
# In project directory
cd /root/lewis-loyality

# Check if PaddleOCR is running
docker ps | grep paddleocr

# Check PaddleOCR logs
docker logs paddleocr 2>&1 | tail -50

# Test PaddleOCR directly
curl -X POST http://localhost:8866/predict/ocr_system \
  -H "Content-Type: application/json" \
  -d '{"images":["base64_encoded_small_image"]}' \
  --max-time 10
```

### Step 2: Check Environment Variables

```bash
# Check current PaddleOCR configuration
echo $PADDLEOCR_URL
echo $PADDLEOCR_TIMEOUT

# Check .env files
cat .env.local 2>/dev/null | grep PADDLEOCR
cat .env 2>/dev/null | grep PADDLEOCR
```

**Expected**:
- `PADDLEOCR_URL=http://localhost:8866` or `http://paddleocr:8866`
- `PADDLEOCR_TIMEOUT=45000` (or lower like 15000 for faster fallback)

### Step 3: Test OCR Performance Directly

Create test script:
```typescript
// test-ocr-performance.ts
import { extractTextFromBuffer } from './lib/ocr';
import fs from 'fs';

async function testOCR() {
  const imageBuffer = fs.readFileSync('test-receipt.jpg');
  const startTime = Date.now();
  
  try {
    const text = await extractTextFromBuffer(imageBuffer);
    const duration = Date.now() - startTime;
    console.log(`✅ OCR completed in ${duration}ms`);
    console.log(`Text length: ${text.length} characters`);
    console.log(`First 100 chars: ${text.substring(0, 100)}`);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ OCR failed after ${duration}ms:`, error);
  }
}

testOCR();
```

### Step 4: Check Logs During Upload

Enable detailed logging:
```bash
# Set debug mode
export PADDLEOCR_DEBUG=true
export NODE_ENV=development

# Monitor logs during upload
tail -f logs/app.log | grep -i "ocr\|paddle"
```

Look for:
- `🚀 Attempting PaddleOCR...`
- `⚠️ PaddleOCR failed after...`
- `🔧 Using Tesseract OCR...`

---

## 🛠️ Solutions & Optimizations

### Solution 1: Reduce PaddleOCR Timeout for Faster Fallback

**Current**: 45 seconds  
**Recommended**: 10-15 seconds for faster fallback

```typescript
// lib/paddleocr.ts
const PADDLEOCR_TIMEOUT = parseInt(process.env.PADDLEOCR_TIMEOUT || '10000', 10); // 10 seconds
```

**Rationale**: 
- If PaddleOCR takes >10 seconds, it's likely stuck or too slow
- Better to fallback to N8N or Tesseract quickly
- Total time: 10s (PaddleOCR) + 8s (N8N) + 15s (Tesseract) = 33s max instead of 68s

### Solution 2: Improve Image Optimization

**Current**: Resize to 1000px max width  
**Optimization**: More aggressive preprocessing

```typescript
// lib/ocr.ts - resizeImageForOCR()
async function resizeImageForOCR(imageBuffer: Buffer, maxWidth: number = 800): Promise<Buffer> {
  // ... existing code ...
  
  // ADD: More aggressive compression for PaddleOCR
  const optimized = await pipeline
    .resize(maxWidth, null, { withoutEnlargement: true, fit: 'inside' })
    .grayscale() // Much faster OCR
    .normalize()
    .sharpen({ sigma: 0.5 })
    .jpeg({ 
      quality: 70, // Lower quality (was 80) - still readable but smaller
      mozjpeg: true,
      progressive: false,
    })
    .toBuffer();
    
  return optimized;
}
```

### Solution 3: Parallel OCR Attempts (Advanced)

Instead of sequential fallback, try multiple OCR methods in parallel:

```typescript
// Try PaddleOCR and Tesseract in parallel
const [paddleResult, tesseractResult] = await Promise.allSettled([
  extractTextFromBufferPaddleOCR(optimizedBuffer).then(text => ({ method: 'paddle', text })),
  // Start Tesseract worker in parallel (will only use if PaddleOCR fails)
  initializeWorker().then(worker => 
    worker.recognize(optimizedBuffer).then(result => ({ method: 'tesseract', text: result.data.text }))
  )
]);

// Use first successful result
const result = paddleResult.status === 'fulfilled' ? paddleResult.value : tesseractResult.value;
```

**Note**: This increases resource usage but reduces total time.

### Solution 4: Pre-warm PaddleOCR Connection

Keep PaddleOCR connection alive:

```typescript
// lib/paddleocr.ts
let paddleOCRHealthy = false;

async function checkPaddleOCRHealth() {
  try {
    const response = await fetch(`${PADDLEOCR_URL}/health`, { 
      signal: AbortSignal.timeout(3000) 
    });
    paddleOCRHealthy = response.ok;
  } catch {
    paddleOCRHealthy = false;
  }
}

// Check health on startup and periodically
setInterval(checkPaddleOCRHealth, 60000); // Every minute
```

### Solution 5: Optimize Image Before Any OCR

Move image optimization earlier in the flow:

```typescript
// app/api/receipts/upload/route.ts
import { resizeImageForOCR } from '@/lib/ocr';

export async function POST(request: NextRequest) {
  // ... file upload ...
  
  // OPTIMIZE IMMEDIATELY after upload
  const optimizedBuffer = await resizeImageForOCR(file.buffer, 800);
  
  // Pass optimized buffer to validator
  const result = await validateAndProcessReceipt({
    imageBuffer: optimizedBuffer, // Use optimized version
    originalFilename: file.originalName,
    storeId: storeId,
    customerPhone: phone,
  });
}
```

---

## 📍 Complete Flow: Receipt Upload → Reward

### Step-by-Step Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CLIENT UPLOAD                                            │
│    POST /api/receipts/upload                                │
│    - Multipart form data                                    │
│    - file: Image (JPG/PNG/HEIC, max 8MB)                   │
│    - storeId: Store ID (optional)                           │
│    - phone: Customer phone (optional)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. FILE UPLOAD HANDLER                                      │
│    lib/upload.ts → handleFileUpload()                       │
│    - Validate file size (< 8MB)                             │
│    - Validate MIME type                                     │
│    - Extract form fields                                    │
│    - Return: { file: { buffer, size, originalName }, fields }│
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. RECEIPT VALIDATION ORCHESTRATOR                          │
│    lib/receiptValidator.ts → validateAndProcessReceipt()   │
│                                                              │
│    STEP 1: OCR TEXT EXTRACTION                              │
│    ├─ lib/ocr.ts → extractTextFromBuffer()                  │
│    │                                                         │
│    │  ┌─ Try PaddleOCR (primary)                            │
│    │  │  lib/paddleocr.ts → extractTextFromBufferPaddleOCR()│
│    │  │  - POST http://paddleocr:8866/predict/ocr_system   │
│    │  │  - Timeout: 10-45 seconds                           │
│    │  │  - Returns: Extracted text                          │
│    │  │                                                      │
│    │  ├─ Fallback: N8N OCR (if configured)                  │
│    │  │  - POST N8N_WEBHOOK_URL                             │
│    │  │  - Timeout: 8 seconds                               │
│    │  │                                                      │
│    │  └─ Fallback: Tesseract.js (last resort)              │
│    │     - Client-side OCR                                  │
│    │     - Timeout: 15 seconds                              │
│    │                                                         │
│    └─ Normalize OCR text                                    │
│       lib/ocr.ts → normalizeOCRText()                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│    STEP 2: RECEIPT PARSING                                  │
│    lib/receiptParser.ts → parseReceiptText()                │
│    - Extract TIN (4 patterns)                               │
│    - Extract Invoice No (5 patterns)                        │
│    - Extract Date (5 formats)                               │
│    - Extract Amount (priority keywords)                     │
│    - Extract Branch (keyword matching)                      │
│    - Extract Barcode (EAN-13, Code 128)                     │
│    - Calculate confidence (high/medium/low)                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│    STEP 3: STORE IDENTIFICATION                             │
│    - If storeId provided: Use it                            │
│    - If not: Identify from TIN in receipt                   │
│    - Fetch Store model from database                        │
│    - Validate store is active                               │
│    - Validate receipt uploads enabled                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│    STEP 4: SAVE RECEIPT IMAGE                               │
│    lib/storage.ts → saveReceiptImage()                      │
│    - Create directory: /uploads/receipts/{storeId}/         │
│    - Generate filename: {timestamp}-{hash}.jpg              │
│    - Save file to disk                                      │
│    - Return relative path: receipts/{storeId}/{filename}    │
│                                                              │
│    Storage Location:                                        │
│    /root/lewis-loyality/uploads/receipts/                   │
│    └── {storeId}/                                           │
│        └── {timestamp}-{randomHash}.jpg                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│    STEP 5: VALIDATE AGAINST STORE RULES                     │
│    lib/receiptParser.ts → validateParsedReceipt()           │
│    - TIN match (fuzzy matching)                             │
│    - Branch match (keyword contains)                        │
│    - Amount >= minReceiptAmount (default: 500 ETB)          │
│    - Date within validity window (default: 24 hours)        │
│                                                              │
│    If validation fails → REJECTED                           │
│    - Create Receipt record with status='rejected'           │
│    - Return rejection details                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│    STEP 6: FRAUD DETECTION                                  │
│    lib/fraudDetector.ts → calculateFraudScore()             │
│    - Calculate pHash (perceptual hash)                      │
│    - Check duplicate images (pHash match)                   │
│    - Check duplicate invoice numbers                        │
│    - Check duplicate barcodes                               │
│    - Detect image tampering                                 │
│    - Detect AI-generated images                             │
│    - Calculate overall fraud score (0-100)                  │
│                                                              │
│    Scoring:                                                 │
│    - Score ≥70: Auto-reject                                 │
│    - Score ≥40 or Tampering ≥50: Auto-flag                 │
│    - Score <40: Continue to approval                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│    STEP 7: DUPLICATE CHECKS                                 │
│    - Check invoice number uniqueness                        │
│    - Check barcode uniqueness                               │
│    - If duplicate found → REJECTED                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│    STEP 8: FLAGGING LOGIC                                   │
│    - Low confidence parsing → FLAGGED                       │
│    - Missing critical fields → FLAGGED                      │
│    - High fraud score → FLAGGED                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│    STEP 9: CREATE APPROVED RECEIPT                          │
│    models/Receipt.create()                                  │
│    - Store all parsed fields                                │
│    - Store OCR text                                         │
│    - Store image path                                       │
│    - Store fraud scores                                     │
│    - Status: 'approved'                                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│    STEP 10: FIND OR CREATE CUSTOMER                         │
│    models/Customer.findOne() or .create()                   │
│    - Search by phone number                                 │
│    - If not found: Create new customer                      │
│    - Link receipt to customer                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│    STEP 11: CREATE VISIT RECORD                             │
│    models/Visit.create()                                    │
│    - customerId: Customer ID                                │
│    - storeId: Store ID                                      │
│    - receiptId: Receipt ID                                  │
│    - visitMethod: 'receipt'                                 │
│    - timestamp: Current date                                │
│    - rewardEarned: false (updated if reward earned)         │
│                                                              │
│    Update Customer:                                         │
│    - customer.totalVisits++                                 │
│    - customer.lastVisit = new Date()                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│    STEP 12: CHECK REWARD ELIGIBILITY                        │
│    models/RewardRule.findOne()                              │
│    - Find active reward rule for store                      │
│    - Check: customer.totalVisits % visitsNeeded === 0       │
│                                                              │
│    If reward earned:                                        │
│    - models/Reward.create()                                 │
│      - code: LEWIS{timestamp}{random}                       │
│      - rewardType: rule.rewardValue                         │
│      - expiresAt: +30 days                                  │
│      - status: 'unused'                                     │
│    - visit.rewardEarned = true                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│    STEP 13: RETURN API RESPONSE                             │
│    {                                                        │
│      success: true,                                         │
│      status: "approved",                                    │
│      message: "Receipt approved - Reward earned!" (if true) │
│      data: {                                                │
│        receiptId: "...",                                    │
│        visitId: "...",                                      │
│        visitCount: 5,                                       │
│        rewardEarned: true,                                  │
│        rewardId: "..."                                      │
│      }                                                      │
│    }                                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 Receipt Storage Location

### File System Structure

```
/root/lewis-loyality/
└── uploads/
    └── receipts/
        ├── {storeId1}/
        │   ├── 1731345678901-a3f5c2d8.jpg
        │   ├── 1731345789012-b4e6d3e9.jpg
        │   └── ...
        ├── {storeId2}/
        │   └── ...
        └── unknown/          (for receipts without storeId)
            └── ...
```

### Storage Functions

**Save** (`lib/storage.ts`):
```typescript
saveReceiptImage(buffer, storeId, originalName)
→ Returns: "receipts/{storeId}/{timestamp}-{hash}.jpg"
```

**Retrieve** (`lib/storage.ts`):
```typescript
getReceiptImage("receipts/{storeId}/{filename}")
→ Returns: Buffer (image data)
```

**Public URL** (`lib/storage.ts`):
```typescript
getReceiptPublicUrl("receipts/{storeId}/{filename}")
→ Returns: "/api/receipts/image/{storeId}/{filename}"
```

**API Endpoint** (`app/api/receipts/image/[storeId]/[filename]/route.ts`):
- Serves receipt images to frontend
- Auth-protected (admin access)

---

## 🧪 Testing Recommendations

### Test 1: OCR Performance Test

```bash
# Create test script
cat > test-ocr-speed.js << 'EOF'
const { extractTextFromBuffer } = require('./lib/ocr');
const fs = require('fs');

async function test() {
  const buffer = fs.readFileSync('test-receipt.jpg');
  const start = Date.now();
  
  try {
    const text = await extractTextFromBuffer(buffer);
    const duration = Date.now() - start;
    console.log(`✅ OCR: ${duration}ms, Text: ${text.length} chars`);
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`❌ OCR failed after ${duration}ms:`, error.message);
  }
}

test();
EOF

# Run test
node test-ocr-speed.js
```

### Test 2: Complete Flow Test

```bash
# Use curl to upload receipt
curl -X POST http://localhost:3000/api/receipts/upload \
  -F "file=@test-receipt.jpg" \
  -F "storeId=YOUR_STORE_ID" \
  -F "phone=+251911234567" \
  -v

# Monitor logs in another terminal
tail -f logs/app.log | grep -E "OCR|PaddleOCR|Step|✅|❌"
```

### Test 3: PaddleOCR Direct Test

```bash
# Test PaddleOCR service directly
curl -X POST http://localhost:8866/predict/ocr_system \
  -H "Content-Type: application/json" \
  -d '{"images":["'$(base64 -w 0 test-receipt.jpg)'"]}' \
  --max-time 10 \
  -v
```

---

## ✅ Action Items

1. **Check PaddleOCR Service**:
   - [ ] Verify Docker container is running
   - [ ] Test direct API call
   - [ ] Check logs for errors

2. **Optimize Timeouts**:
   - [ ] Reduce PaddleOCR timeout to 10-15 seconds
   - [ ] Test fallback chain performance

3. **Improve Image Optimization**:
   - [ ] Verify optimization happens before OCR
   - [ ] Test with different image sizes

4. **Add Monitoring**:
   - [ ] Log OCR method used
   - [ ] Log processing time per step
   - [ ] Track success/failure rates

5. **Test Complete Flow**:
   - [ ] Upload test receipt
   - [ ] Verify storage location
   - [ ] Verify reward creation
   - [ ] Check all database records

---

## 📝 Next Steps

1. **Immediate**: Check if PaddleOCR service is running
2. **Short-term**: Reduce timeouts and optimize image preprocessing
3. **Long-term**: Consider parallel OCR attempts or alternative OCR services

---

**Status**: 🔍 Investigation In Progress  
**Priority**: 🔴 High (Affects user experience)

