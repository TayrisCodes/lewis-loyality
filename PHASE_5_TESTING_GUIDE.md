# Phase 5: Testing & Validation Guide

## Overview

This document provides instructions for running comprehensive tests for:
1. PaddleOCR Integration
2. Fraud Detection System
3. Admin UI Functionality

## Prerequisites

1. **Environment Setup**
   - MongoDB connection configured (`.env.local` or `.env`)
   - Docker services running (if testing PaddleOCR)
   - Node.js dependencies installed

2. **Services Required**
   - MongoDB (Atlas or local)
   - PaddleOCR container (optional - fallback will work)
   - Application server (for API tests)

## Test Scripts

### 1. PaddleOCR Integration Tests

**File**: `scripts/test-paddleocr.ts`

**Tests**:
- ✅ OCR speed comparison (PaddleOCR vs Tesseract)
- ✅ Fallback chain (PaddleOCR → N8N → Tesseract)
- ✅ Error handling (service down, timeouts)
- ✅ Service availability check

**Run**:
```bash
cd /root/lewis-loyality
npm run test:paddleocr
```

**Expected Results**:
- PaddleOCR: 5-7 seconds (if service running)
- Fallback to Tesseract: 30-90 seconds
- Graceful error handling

### 2. Fraud Detection Tests

**File**: `scripts/test-fraud-detection.ts`

**Tests**:
- ✅ pHash duplicate detection
- ✅ Image tampering detection
- ✅ AI-generated image detection
- ✅ Fraud score calculation
- ✅ Threshold testing (≥70 reject, ≥40 flag)

**Run**:
```bash
cd /root/lewis-loyality
npm run test:fraud
```

**Expected Results**:
- pHash calculation working
- Duplicate detection in database
- Tampering scores calculated
- AI detection probabilities
- Fraud scores with correct thresholds

### 3. Admin UI API Tests

**File**: `scripts/test-admin-ui-api.ts`

**Tests**:
- ✅ Fraud score storage and retrieval
- ✅ Filtering by fraud score ranges
- ✅ Fraud investigation queries
- ✅ Database indexes verification

**Run**:
```bash
cd /root/lewis-loyality
npm run test:admin
```

**Expected Results**:
- Fraud scores stored in database
- Filtering queries work (high/medium/low)
- Investigation workflow functional
- Indexes exist for performance

## Running All Tests

### Option 1: NPM Script
```bash
npm run test:all
```

### Option 2: Shell Script
```bash
./scripts/run-tests.sh
```

### Option 3: Individual Tests
```bash
npm run test:paddleocr
npm run test:fraud
npm run test:admin
```

## Manual Testing via API

### Test Receipt Upload with Fraud Detection

```bash
# Upload a receipt (fraud detection runs automatically)
curl -X POST http://localhost:3015/api/receipts/upload \
  -H "Content-Type: multipart/form-data" \
  -F "image=@/path/to/receipt.jpg" \
  -F "storeId=YOUR_STORE_ID" \
  -F "customerPhone=+251900000000"

# Check response for fraud scores
# Response should include:
# - fraudScore
# - tamperingScore
# - aiDetectionScore
# - fraudFlags
# - imageHash
```

### Test Fraud Filtering API

```bash
# Get receipts with high fraud scores
curl "http://localhost:3015/api/admin/receipts?fraudFilter=high" \
  -H "Cookie: your-auth-cookie"

# Get receipts with medium fraud scores
curl "http://localhost:3015/api/admin/receipts?fraudFilter=medium" \
  -H "Cookie: your-auth-cookie"

# Get receipts with low fraud scores
curl "http://localhost:3015/api/admin/receipts?fraudFilter=low" \
  -H "Cookie: your-auth-cookie"
```

## MongoDB Direct Testing

### Check Fraud Scores in Database

```bash
# Connect to MongoDB
mongosh "YOUR_MONGODB_URI"

# Query receipts with fraud scores
db.receipts.find({ fraudScore: { $exists: true } }).limit(5)

# Count by fraud score ranges
db.receipts.countDocuments({ fraudScore: { $gte: 70 } })  // High
db.receipts.countDocuments({ fraudScore: { $gte: 40, $lt: 70 } })  // Medium
db.receipts.countDocuments({ fraudScore: { $lt: 40 } })  // Low

# Check for duplicates by imageHash
db.receipts.aggregate([
  { $group: { _id: "$imageHash", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])

# Verify indexes
db.receipts.getIndexes()
```

## Test Scenarios

### Scenario 1: Duplicate Image Upload
1. Upload receipt image A
2. Upload same image A again
3. **Expected**: Second upload should have high fraud score (duplicate detected)

### Scenario 2: High Fraud Score
1. Upload receipt with manipulated image
2. **Expected**: 
   - Fraud score ≥70 → Auto-rejected
   - Fraud flags include tampering indicators

### Scenario 3: Medium Fraud Score
1. Upload receipt with suspicious patterns
2. **Expected**:
   - Fraud score 40-69 → Flagged for review
   - Admin can see fraud details in UI

### Scenario 4: OCR Fallback
1. Stop PaddleOCR container
2. Upload receipt
3. **Expected**: Falls back to Tesseract, still processes successfully

## Verification Checklist

### PaddleOCR Integration
- [ ] PaddleOCR service accessible
- [ ] Fallback to N8N works (if configured)
- [ ] Fallback to Tesseract works
- [ ] Error handling graceful
- [ ] Speed improvement verified (5-7s vs 30-90s)

### Fraud Detection
- [ ] pHash calculation working
- [ ] Duplicate detection working
- [ ] Tampering detection working
- [ ] AI detection working
- [ ] Fraud scores calculated correctly
- [ ] Thresholds working (≥70 reject, ≥40 flag)

### Admin UI
- [ ] Fraud scores display in detail page
- [ ] Fraud scores display in list page
- [ ] Filtering by fraud score works
- [ ] Fraud investigation section shows
- [ ] Approve/reject buttons show warnings
- [ ] Database indexes exist

## Troubleshooting

### MongoDB Connection Issues
- Check `.env.local` or `.env` file has `MONGODB_URI`
- Verify MongoDB URI format is correct
- Check network connectivity to MongoDB

### PaddleOCR Not Accessible
- Check container is running: `docker ps | grep paddleocr`
- Check logs: `docker logs lewis-loyalty-paddleocr`
- Verify network: `docker network inspect lewis-network`
- Fallback will work if PaddleOCR unavailable

### Test Scripts Fail
- Ensure environment variables are loaded
- Check MongoDB connection
- Verify Node.js dependencies installed
- Check file permissions on scripts

## Performance Benchmarks

### OCR Speed
- **PaddleOCR**: 5-7 seconds (target)
- **N8N OCR**: 2-10 seconds (if configured)
- **Tesseract**: 30-90 seconds (fallback)

### Fraud Detection
- **pHash Calculation**: <1 second
- **Tampering Detection**: ~1-2 seconds
- **AI Detection**: ~1 second
- **Total Fraud Check**: ~2-3 seconds

### Total Processing Time
- **With PaddleOCR**: ~7-10 seconds
- **With Tesseract**: ~32-93 seconds

## Success Criteria

✅ **PaddleOCR Integration**
- Service accessible and responding
- Fallback chain works correctly
- Speed improvement achieved

✅ **Fraud Detection**
- All detection methods working
- Scores calculated correctly
- Thresholds enforced properly

✅ **Admin UI**
- Fraud data displays correctly
- Filtering and sorting work
- Investigation workflow functional

## Next Steps After Testing

1. Monitor real-world performance
2. Adjust fraud score thresholds if needed
3. Review false positive/negative rates
4. Optimize based on usage patterns
5. Document any issues found

