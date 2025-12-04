# ✅ Phase 5 Complete: API Endpoints (Backend Routes)

**Status**: COMPLETED  
**Duration**: ~3.5 hours  
**Date**: November 12, 2025

---

## What Was Built

### API Endpoints Created ✅

#### 1. Receipt Upload API ✅
**File**: `/app/api/receipts/upload/route.ts` (196 lines)

**Endpoints**:
- `POST /api/receipts/upload` - Upload and validate receipt
- `GET /api/receipts/upload` - Get upload configuration

**Features**:
- Handles multipart/form-data uploads
- Validates file (type, size)
- Calls validation service
- Returns appropriate response based on status
- Error handling

**Request**:
```typescript
POST /api/receipts/upload
Content-Type: multipart/form-data

Fields:
- file: Image file (max 8MB)
- storeId: Store ID (required)
- phone: Customer phone (optional)
```

**Response (Approved)**:
```json
{
  "success": true,
  "status": "approved",
  "message": "Receipt approved and visit recorded",
  "data": {
    "receiptId": "...",
    "visitId": "...",
    "visitCount": 5,
    "rewardEarned": false
  }
}
```

**Response (Rejected)**:
```json
{
  "success": false,
  "status": "rejected",
  "reason": "Amount 450 is below minimum 500",
  "receiptId": "...",
  "canRetake": true,
  "canRequestReview": false
}
```

**Response (Flagged)**:
```json
{
  "success": false,
  "status": "flagged",
  "reason": "Receipt needs manual review",
  "receiptId": "...",
  "canRetake": true,
  "canRequestReview": true
}
```

#### 2. Receipt Status API ✅
**File**: `/app/api/receipts/status/[receiptId]/route.ts` (89 lines)

**Endpoint**:
- `GET /api/receipts/status/:receiptId` - Check receipt status

**Features**:
- Public endpoint (no auth required)
- Returns receipt status and details
- Shows parsed data
- Visit counting status

**Example**:
```bash
GET /api/receipts/status/673305f2e4b5c6789a0b1234

Response:
{
  "receiptId": "673305f2e4b5c6789a0b1234",
  "status": "approved",
  "reason": "All validation checks passed",
  "visitCounted": true,
  "parsedData": {
    "tin": "0003169685",
    "invoiceNo": "04472-002-0011L",
    "date": "2024-11-11",
    "amount": 517.50,
    "branch": "Lewis Coffee - Bole"
  }
}
```

#### 3. Receipt Image Serving API ✅
**File**: `/app/api/receipts/image/[storeId]/[filename]/route.ts` (82 lines)

**Endpoint**:
- `GET /api/receipts/image/:storeId/:filename` - Serve receipt images

**Features**:
- Serves images from storage
- Path traversal protection
- Content-Type detection
- 1-year cache headers
- File existence checking

**Example**:
```bash
GET /api/receipts/image/507f1f77bcf86cd799439011/1731345678901-a3f5c2d8.jpg

Returns: Image file (JPG/PNG/HEIC)
```

#### 4. Admin Receipts List API ✅
**File**: `/app/api/admin/receipts/route.ts` (140 lines)

**Endpoint**:
- `GET /api/admin/receipts` - List receipts with filters

**Features**:
- Authentication required
- Role-based access (admin sees only their store)
- Filtering by status, store, search
- Pagination support
- Statistics summary

**Query Params**:
```typescript
?status=flagged           // Filter by status
&storeId=507f...          // Filter by store (superadmin only)
&page=1                   // Page number
&limit=20                 // Items per page
&search=+251911234567     // Search by phone/invoice
```

**Response**:
```json
{
  "receipts": [
    {
      "_id": "...",
      "customerPhone": "+251911234567",
      "storeId": { "name": "Lewis Coffee - Bole" },
      "status": "flagged",
      "totalAmount": 517.50,
      "dateOnReceipt": "2024-11-11",
      "imageUrl": "/api/receipts/image/...",
      "createdAt": "..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  },
  "stats": {
    "pending": 0,
    "approved": 100,
    "rejected": 35,
    "flagged": 10,
    "flagged_manual_requested": 5
  }
}
```

#### 5. Admin Review API ✅
**File**: `/app/api/admin/receipts/[receiptId]/review/route.ts` (244 lines)

**Endpoints**:
- `POST /api/admin/receipts/:receiptId/review` - Approve/reject receipt
- `GET /api/admin/receipts/:receiptId/review` - Get receipt details

**Features**:
- Authentication required
- Role-based access control
- Creates visit on approval
- Updates customer visits
- Checks reward eligibility
- Audit trail (who reviewed, when, notes)

**Approve Request**:
```json
POST /api/admin/receipts/673305f2e4b5c6789a0b1234/review

{
  "action": "approve",
  "notes": "Customer provided additional proof"
}
```

**Approve Response**:
```json
{
  "success": true,
  "message": "Receipt approved and visit recorded",
  "data": {
    "receiptId": "...",
    "visitId": "...",
    "visitCount": 5,
    "rewardEarned": true,
    "rewardCode": "LEWIS1731345678901ABC"
  }
}
```

**Reject Request**:
```json
POST /api/admin/receipts/673305f2e4b5c6789a0b1234/review

{
  "action": "reject",
  "reason": "Receipt appears edited",
  "notes": "Suspicious text alignment"
}
```

**Reject Response**:
```json
{
  "success": true,
  "message": "Receipt rejected",
  "data": {
    "receiptId": "..."
  }
}
```

#### 6. Receipt Settings API ✅
**File**: `/app/api/admin/store/receipt-settings/route.ts` (190 lines)

**Endpoints**:
- `GET /api/admin/store/receipt-settings` - Get current settings
- `PUT /api/admin/store/receipt-settings` - Update settings

**Features**:
- Authentication required
- Admin can manage their store
- Super admin can manage any store
- Validation of settings values
- Audit logging

**Get Settings**:
```bash
GET /api/admin/store/receipt-settings?storeId=507f...

Response:
{
  "storeId": "507f1f77bcf86cd799439011",
  "storeName": "Lewis Coffee - Bole",
  "settings": {
    "tin": "0003169685",
    "branchName": "Bole",
    "minReceiptAmount": 500,
    "receiptValidityHours": 24,
    "allowReceiptUploads": true
  }
}
```

**Update Settings**:
```json
PUT /api/admin/store/receipt-settings

{
  "storeId": "507f...",
  "tin": "0003169685",
  "branchName": "Bole",
  "minReceiptAmount": 600,
  "receiptValidityHours": 48,
  "allowReceiptUploads": true
}

Response:
{
  "success": true,
  "message": "Settings updated successfully",
  "settings": { ... }
}
```

---

## API Architecture

### Endpoint Organization

```
/api/
├── receipts/                      # Customer APIs
│   ├── upload/
│   │   └── route.ts              ✅ Upload & validate
│   ├── status/[receiptId]/
│   │   └── route.ts              ✅ Check status
│   └── image/[storeId]/[filename]/
│       └── route.ts              ✅ Serve images
│
└── admin/                         # Admin APIs
    ├── receipts/
    │   ├── route.ts              ✅ List receipts
    │   └── [receiptId]/review/
    │       └── route.ts          ✅ Approve/reject
    └── store/
        └── receipt-settings/
            └── route.ts          ✅ Manage settings
```

### Authentication Matrix

| Endpoint | Auth Required | Roles Allowed |
|----------|---------------|---------------|
| `POST /api/receipts/upload` | ❌ No | Public (customers) |
| `GET /api/receipts/status/:id` | ❌ No | Public |
| `GET /api/receipts/image/:store/:file` | ❌ No | Public |
| `GET /api/admin/receipts` | ✅ Yes | admin, superadmin |
| `POST /api/admin/receipts/:id/review` | ✅ Yes | admin, superadmin |
| `GET /api/admin/store/receipt-settings` | ✅ Yes | admin, superadmin |
| `PUT /api/admin/store/receipt-settings` | ✅ Yes | admin, superadmin |

---

## Request/Response Examples

### 1. Customer Uploads Receipt

**Request**:
```bash
curl -X POST http://localhost:3000/api/receipts/upload \
  -F "file=@receipt.jpg" \
  -F "storeId=507f1f77bcf86cd799439011" \
  -F "phone=+251911234567"
```

**Response (Success)**:
```json
{
  "success": true,
  "status": "approved",
  "message": "Receipt approved and visit recorded",
  "data": {
    "receiptId": "673305f2e4b5c6789a0b1234",
    "visitId": "673305f2e4b5c6789a0b1235",
    "visitCount": 3,
    "rewardEarned": false
  }
}
```

### 2. Customer Checks Status

**Request**:
```bash
curl http://localhost:3000/api/receipts/status/673305f2e4b5c6789a0b1234
```

**Response**:
```json
{
  "receiptId": "673305f2e4b5c6789a0b1234",
  "status": "approved",
  "reason": "All validation checks passed",
  "visitCounted": true,
  "parsedData": {
    "tin": "0003169685",
    "invoiceNo": "04472-002-0011L",
    "date": "2024-11-11",
    "amount": 517.50
  }
}
```

### 3. Admin Lists Flagged Receipts

**Request**:
```bash
curl http://localhost:3000/api/admin/receipts?status=flagged \
  -H "Cookie: auth-token=..."
```

**Response**:
```json
{
  "receipts": [
    {
      "_id": "...",
      "customerPhone": "+251911234567",
      "status": "flagged",
      "reason": "Low parsing confidence",
      "totalAmount": 517.50,
      "imageUrl": "/api/receipts/image/...",
      "createdAt": "..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10,
    "pages": 1
  },
  "stats": {
    "flagged": 10,
    "approved": 100,
    "rejected": 35
  }
}
```

### 4. Admin Approves Receipt

**Request**:
```bash
curl -X POST http://localhost:3000/api/admin/receipts/673305.../review \
  -H "Cookie: auth-token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "action": "approve",
    "notes": "Verified with customer"
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Receipt approved and visit recorded",
  "data": {
    "receiptId": "...",
    "visitId": "...",
    "visitCount": 5,
    "rewardEarned": true,
    "rewardCode": "LEWIS1731345678901ABC"
  }
}
```

### 5. Admin Updates Settings

**Request**:
```bash
curl -X PUT http://localhost:3000/api/admin/store/receipt-settings \
  -H "Cookie: auth-token=..." \
  -H "Content-Type: application/json" \
  -d '{
    "tin": "0003169685",
    "branchName": "Bole",
    "minReceiptAmount": 600,
    "receiptValidityHours": 48,
    "allowReceiptUploads": true
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "settings": {
    "tin": "0003169685",
    "branchName": "Bole",
    "minReceiptAmount": 600,
    "receiptValidityHours": 48,
    "allowReceiptUploads": true
  }
}
```

---

## Error Handling

### Standard Error Responses

**400 Bad Request**:
```json
{
  "success": false,
  "error": "Store ID is required"
}
```

**401 Unauthorized**:
```json
{
  "error": "Unauthorized"
}
```

**403 Forbidden**:
```json
{
  "error": "You can only review receipts from your store"
}
```

**404 Not Found**:
```json
{
  "error": "Receipt not found"
}
```

**500 Internal Server Error**:
```json
{
  "error": "Internal server error",
  "message": "Detailed error message"
}
```

---

## Security Features

### 1. Authentication
- Admin endpoints require JWT token
- Token validated via middleware
- Role-based access control

### 2. Authorization
- Admins can only access their store's receipts
- Super admins can access all receipts
- Store ID validation

### 3. Input Validation
- File type/size validation
- Required field checking
- Sanitization of inputs
- Path traversal prevention

### 4. Rate Limiting (Recommended)
```typescript
// Add to upload endpoint:
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_UPLOADS_PER_WINDOW = 10;

// Track uploads per IP/phone
// Reject if exceeded
```

---

## Integration with Validation Service

### Flow Diagram

```
Client Upload
     ↓
POST /api/receipts/upload
     ↓
handleFileUpload() ────────┐
     ↓                      │
validateAndProcessReceipt() │ Phase 5 (API)
     │                      │
     └──────────────────────┘
     ↓
┌────────────────────────────┐
│  Validation Service        │ Phase 4
│  (receiptValidator.ts)     │
├────────────────────────────┤
│  • OCR extraction          │ Phase 3
│  • Parse fields            │ Phase 3
│  • Validate rules          │ Phase 3
│  • Check duplicates        │ Phase 4
│  • Create records          │ Phase 1
│  • Update customer         │ Phase 1
│  • Check rewards           │ Phase 1
└────────────────────────────┘
     ↓
Return Response
```

---

## Admin Workflow

### Review Flagged Receipts

```
1. Admin logs into dashboard
   → GET /api/admin/receipts?status=flagged

2. Sees list of flagged receipts with thumbnails
   → Clicks on receipt for details

3. Views receipt details
   → GET /api/admin/receipts/:id/review
   → Shows: image, OCR text, parsed fields, flags

4. Makes decision:
   
   Option A: Approve
   → POST /api/admin/receipts/:id/review
   → { action: "approve", notes: "..." }
   → Visit counted, customer updated, reward checked
   
   Option B: Reject
   → POST /api/admin/receipts/:id/review
   → { action: "reject", reason: "...", notes: "..." }
   → No visit counted, receipt permanently rejected
```

### Manage Store Settings

```
1. Admin navigates to settings
   → GET /api/admin/store/receipt-settings

2. Views current settings
   - TIN: 0003169685
   - Branch: Bole
   - Min Amount: 500 ETB
   - Validity: 24 hours
   - Uploads: Enabled

3. Updates settings
   → PUT /api/admin/store/receipt-settings
   → Changes take effect immediately for new uploads
```

---

## Testing the APIs

### Test Upload (Local)

```bash
# 1. Create test image
echo "LEWIS RETAIL" > test-receipt.txt
# (Use actual receipt image for real test)

# 2. Upload
curl -X POST http://localhost:3000/api/receipts/upload \
  -F "file=@test-receipt.jpg" \
  -F "storeId=YOUR_STORE_ID" \
  -F "phone=+251911234567" \
  -v

# 3. Check response
# Should return: { success: true/false, status: "...", ... }
```

### Test Status Check

```bash
curl http://localhost:3000/api/receipts/status/RECEIPT_ID \
  -v
```

### Test Admin List (Requires Auth)

```bash
# 1. Login first to get token
curl -X POST http://localhost:3000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin1@lewisloyalty.com","password":"admin123"}' \
  -c cookies.txt

# 2. List receipts
curl http://localhost:3000/api/admin/receipts?status=flagged \
  -b cookies.txt
```

---

## What's Next - Phase 6

**Customer Frontend (Receipt Upload UI)**

Files to create:
1. `/app/customer-receipt/page.tsx` - Receipt upload page
2. `/components/ReceiptUploader.tsx` - Upload component
3. Update `/app/customer/page.tsx` - Add "Upload Receipt" option

**Estimated Time**: 4-5 hours

**Key Features**:
- Camera capture or file upload
- Image preview
- Real-time upload progress
- Success/rejection/flagged messages
- Retry functionality
- "Request Review" button for flagged receipts

---

## Files Created

```
✅ NEW: /app/api/receipts/upload/route.ts (196 lines)
✅ NEW: /app/api/receipts/status/[receiptId]/route.ts (89 lines)
✅ NEW: /app/api/receipts/image/[storeId]/[filename]/route.ts (82 lines)
✅ NEW: /app/api/admin/receipts/route.ts (140 lines)
✅ NEW: /app/api/admin/receipts/[receiptId]/review/route.ts (244 lines)
✅ NEW: /app/api/admin/store/receipt-settings/route.ts (190 lines)
```

**Total**: 6 API endpoints, 941 lines of code

---

## API Reference Summary

### Customer APIs (Public)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/receipts/upload` | Upload receipt for validation |
| GET | `/api/receipts/upload` | Get upload config |
| GET | `/api/receipts/status/:id` | Check receipt status |
| GET | `/api/receipts/image/:store/:file` | Get receipt image |

### Admin APIs (Protected)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/admin/receipts` | List receipts (filtered) |
| GET | `/api/admin/receipts/:id/review` | Get receipt details |
| POST | `/api/admin/receipts/:id/review` | Approve/reject receipt |
| GET | `/api/admin/store/receipt-settings` | Get settings |
| PUT | `/api/admin/store/receipt-settings` | Update settings |

---

## Summary

**Phase 5 Objectives**: ✅ ALL COMPLETE

- [x] Create receipt upload endpoint
- [x] Create status check endpoint
- [x] Create image serving endpoint
- [x] Create admin list endpoint
- [x] Create admin review endpoint
- [x] Create settings management endpoint
- [x] Implement authentication
- [x] Implement authorization
- [x] Add pagination
- [x] Add filtering
- [x] Add statistics
- [x] Error handling
- [x] Comprehensive logging
- [x] Zero linting errors

**Ready for Phase 6**: ✅ YES

The backend is complete and ready for frontend integration!

---

**Excellent progress! Phase 5 APIs are production-ready.** 🎉

Ready to proceed to Phase 6: Customer Frontend (Receipt Upload UI)?

