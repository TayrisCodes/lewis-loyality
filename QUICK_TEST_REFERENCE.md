# Quick Test Reference

## Run Tests

```bash
# All tests
npm run test:all

# Individual tests
npm run test:paddleocr    # PaddleOCR integration
npm run test:fraud        # Fraud detection
npm run test:admin        # Admin UI API

# Using shell script
./scripts/run-tests.sh
```

## Test Coverage

### ✅ PaddleOCR Integration
- Service availability
- OCR speed (5-7s target)
- Fallback chain (PaddleOCR → N8N → Tesseract)
- Error handling

### ✅ Fraud Detection
- pHash duplicate detection
- Image tampering detection
- AI-generated image detection
- Fraud score calculation
- Threshold enforcement (≥70 reject, ≥40 flag)

### ✅ Admin UI
- Fraud score display
- Filtering by fraud score
- Fraud investigation workflow
- Database indexes

## MongoDB Queries

```javascript
// High fraud receipts
db.receipts.find({ fraudScore: { $gte: 70 } })

// Medium fraud receipts
db.receipts.find({ fraudScore: { $gte: 40, $lt: 70 } })

// Duplicates by imageHash
db.receipts.aggregate([
  { $group: { _id: "$imageHash", count: { $sum: 1 } } },
  { $match: { count: { $gt: 1 } } }
])

// Check indexes
db.receipts.getIndexes()
```

## API Endpoints

```bash
# Upload receipt (fraud detection automatic)
POST /api/receipts/upload

# List receipts with fraud filter
GET /api/admin/receipts?fraudFilter=high
GET /api/admin/receipts?fraudFilter=medium
GET /api/admin/receipts?fraudFilter=low

# Get receipt details (includes fraud scores)
GET /api/admin/receipts/{receiptId}/review
```

