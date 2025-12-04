# Receipt Verification System - Migration Guide

## Phase 1: Database Schema Updates ✅ COMPLETED

### Changes Made

#### 1. New Receipt Model (`/models/Receipt.ts`)
- Complete receipt validation and tracking system
- Fields: customerPhone, storeId, imageUrl, ocrText, tin, branchText, invoiceNo, dateOnReceipt, totalAmount, barcodeData
- Status workflow: pending → approved/rejected/flagged/flagged_manual_requested
- Indexes on: invoiceNo, barcodeData, status, storeId, customerPhone

#### 2. Updated Store Model (`/models/Store.ts`)
Added receipt verification settings:
- `tin` (string) - Tax Identification Number for validation
- `branchName` (string) - Branch identifier for receipt matching
- `minReceiptAmount` (number) - Minimum purchase amount (default: 500)
- `receiptValidityHours` (number) - Receipt age limit (default: 24 hours)
- `allowReceiptUploads` (boolean) - Enable/disable feature per store (default: true)

#### 3. Updated Visit Model (`/models/Visit.ts`)
Added receipt tracking:
- `receiptId` (ObjectId) - Reference to Receipt document
- `visitMethod` (enum: 'qr' | 'receipt') - How visit was recorded (default: 'qr')
- New indexes for receipt-based queries

### Database Migration Steps

#### For Existing Installations:

**Option 1: Automatic (MongoDB will handle)**
- No action required! MongoDB will automatically add new fields with default values
- Existing visits will have `visitMethod: 'qr'` by default
- Existing stores will have receipt uploads enabled with default settings

**Option 2: Manual (Recommended for Production)**

```javascript
// Connect to MongoDB
mongosh "mongodb://admin:password123@localhost:27017/lewis-loyalty?authSource=admin"

// Update all existing stores with default receipt settings
db.stores.updateMany(
  { tin: { $exists: false } },
  {
    $set: {
      minReceiptAmount: 500,
      receiptValidityHours: 24,
      allowReceiptUploads: true
    }
  }
)

// Update all existing visits to mark as QR-based
db.visits.updateMany(
  { visitMethod: { $exists: false } },
  { $set: { visitMethod: 'qr' } }
)

// Verify updates
db.stores.findOne()  // Check receipt fields exist
db.visits.findOne()  // Check visitMethod exists
```

#### For New Installations:
- Simply run `npm run seed:comprehensive` 
- All stores will be created with default receipt settings

### Seed Data Updates Needed

Update seed scripts to include receipt settings for stores:

```typescript
// In scripts/seed-comprehensive.ts or similar
const store = await Store.create({
  name: "Lewis Coffee - Bole",
  address: "123 Bole Road",
  // ... existing fields ...
  
  // Add receipt settings
  tin: "0003169685",  // Company TIN
  branchName: "Bole",  // Or "Banbis" etc.
  minReceiptAmount: 500,
  receiptValidityHours: 24,
  allowReceiptUploads: true,
});
```

### Testing the Schema Changes

```bash
# Start MongoDB
docker-compose up -d mongodb

# Run seed with new schema
npm run seed:comprehensive

# Verify Receipt model exists
mongosh "mongodb://admin:password123@localhost:27017/lewis-loyalty?authSource=admin"
> show collections  // Should see 'receipts' collection
> db.stores.findOne()  // Should see tin, branchName, etc.
> db.visits.findOne()  // Should see visitMethod field
```

### Next Steps

**Phase 2: File Upload & Storage** (Ready to start)
- Create `/lib/storage.ts` for file management
- Create `/lib/upload.ts` for Multer configuration
- Set up `/uploads/receipts/` directory

**Phase 3: OCR Processing** (After Phase 2)
- Install tesseract.js
- Create OCR and parsing utilities
- Test with sample receipts

---

## Schema Reference

### Receipt Collection
```typescript
{
  _id: ObjectId,
  customerPhone: string,
  customerId: ObjectId,
  storeId: ObjectId,
  imageUrl: string,
  ocrText: string,
  tin: string,
  branchText: string,
  invoiceNo: string,
  dateOnReceipt: string,  // YYYY-MM-DD
  totalAmount: number,
  barcodeData: string,
  status: 'pending' | 'approved' | 'rejected' | 'flagged' | 'flagged_manual_requested',
  reason: string,
  flags: [string],
  processedAt: Date,
  reviewedBy: ObjectId,
  reviewedAt: Date,
  reviewNotes: string,
  createdAt: Date,
  updatedAt: Date
}
```

### Store Collection (Added Fields)
```typescript
{
  // ... existing fields ...
  tin: string,
  branchName: string,
  minReceiptAmount: number,
  receiptValidityHours: number,
  allowReceiptUploads: boolean
}
```

### Visit Collection (Added Fields)
```typescript
{
  // ... existing fields ...
  receiptId: ObjectId,
  visitMethod: 'qr' | 'receipt'
}
```

---

## Rollback Instructions (If Needed)

If you need to rollback the schema changes:

```javascript
// Remove receipt fields from stores
db.stores.updateMany(
  {},
  {
    $unset: {
      tin: "",
      branchName: "",
      minReceiptAmount: "",
      receiptValidityHours: "",
      allowReceiptUploads: ""
    }
  }
)

// Remove receipt fields from visits
db.visits.updateMany(
  {},
  { $unset: { receiptId: "", visitMethod: "" } }
)

// Drop receipts collection
db.receipts.drop()
```

---

**Status**: Phase 1 Complete ✅  
**Next**: Phase 2 - File Upload & Storage  
**Date**: November 2025


