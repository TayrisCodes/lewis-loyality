# Receipt Verification API Documentation

**Version**: 1.0  
**Base URL**: `http://localhost:3000` (development)  
**Last Updated**: November 12, 2025

---

## Table of Contents

1. [Customer APIs](#customer-apis)
2. [Admin APIs](#admin-apis)
3. [Authentication](#authentication)
4. [Error Codes](#error-codes)
5. [Examples](#examples)

---

## Customer APIs

### 1. Upload Receipt

**Endpoint**: `POST /api/receipts/upload`  
**Auth**: None (public)  
**Content-Type**: `multipart/form-data`

**Request**:
```
POST /api/receipts/upload

Form Data:
- file: Image file (required)
  * Max size: 8MB
  * Formats: JPG, PNG, HEIC
- storeId: string (required)
- phone: string (optional, e.g., "+251911234567")
```

**Response (200 - Approved)**:
```json
{
  "success": true,
  "status": "approved",
  "message": "Receipt approved and visit recorded",
  "data": {
    "receiptId": "673305f2e4b5c6789a0b1234",
    "visitId": "673305f2e4b5c6789a0b1235",
    "visitCount": 5,
    "rewardEarned": true,
    "rewardId": "673305f2e4b5c6789a0b1236"
  }
}
```

**Response (400 - Rejected)**:
```json
{
  "success": false,
  "status": "rejected",
  "reason": "Amount 450 is below minimum 500",
  "receiptId": "673305f2e4b5c6789a0b1234",
  "canRetake": true,
  "canRequestReview": false
}
```

**Response (202 - Flagged)**:
```json
{
  "success": false,
  "status": "flagged",
  "reason": "Receipt needs manual review by admin",
  "receiptId": "673305f2e4b5c6789a0b1234",
  "canRetake": true,
  "canRequestReview": true
}
```

### 2. Check Receipt Status

**Endpoint**: `GET /api/receipts/status/:receiptId`  
**Auth**: None (public)

**Request**:
```
GET /api/receipts/status/673305f2e4b5c6789a0b1234
```

**Response (200)**:
```json
{
  "receiptId": "673305f2e4b5c6789a0b1234",
  "status": "approved",
  "reason": "All validation checks passed",
  "visitCounted": true,
  "submittedAt": "2024-11-11T10:30:00.000Z",
  "processedAt": "2024-11-11T10:30:02.500Z",
  "parsedData": {
    "tin": "0003169685",
    "invoiceNo": "04472-002-0011L",
    "date": "2024-11-11",
    "amount": 517.50,
    "branch": "Lewis Coffee - Bole"
  },
  "flags": [],
  "store": {
    "name": "Lewis Coffee - Bole",
    "address": "123 Bole Road, Addis Ababa"
  }
}
```

### 3. Get Receipt Image

**Endpoint**: `GET /api/receipts/image/:storeId/:filename`  
**Auth**: None (public)

**Request**:
```
GET /api/receipts/image/507f1f77bcf86cd799439011/1731345678901-a3f5c2d8.jpg
```

**Response (200)**:
```
Content-Type: image/jpeg
Cache-Control: public, max-age=31536000, immutable

<image binary data>
```

### 4. Get Upload Configuration

**Endpoint**: `GET /api/receipts/upload`  
**Auth**: None (public)

**Response (200)**:
```json
{
  "maxFileSize": 8388608,
  "maxFileSizeMB": 8,
  "allowedTypes": ["image/jpeg", "image/png", "image/heic"],
  "allowedExtensions": [".jpg", ".jpeg", ".png", ".heic"]
}
```

---

## Admin APIs

### 1. List Receipts

**Endpoint**: `GET /api/admin/receipts`  
**Auth**: Required (JWT cookie)  
**Roles**: admin, superadmin

**Query Parameters**:
```
?status=flagged              # Filter by status
&storeId=507f...             # Filter by store (superadmin only)
&page=1                      # Page number (default: 1)
&limit=20                    # Items per page (default: 20)
&search=+251911234567        # Search phone/invoice
```

**Response (200)**:
```json
{
  "receipts": [
    {
      "_id": "673305f2e4b5c6789a0b1234",
      "customerPhone": "+251911234567",
      "customerId": {
        "name": "Abebe Bekele",
        "phone": "+251911234567"
      },
      "storeId": {
        "name": "Lewis Coffee - Bole",
        "address": "123 Bole Road"
      },
      "status": "flagged",
      "reason": "Low parsing confidence",
      "totalAmount": 517.50,
      "dateOnReceipt": "2024-11-11",
      "invoiceNo": "04472-002-0011L",
      "imageUrl": "/api/receipts/image/507f.../1731345678901.jpg",
      "flags": ["Invoice number not found"],
      "createdAt": "2024-11-11T10:30:00.000Z"
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

### 2. Get Receipt Details for Review

**Endpoint**: `GET /api/admin/receipts/:receiptId/review`  
**Auth**: Required  
**Roles**: admin, superadmin

**Response (200)**:
```json
{
  "receipt": {
    "_id": "673305f2e4b5c6789a0b1234",
    "customerPhone": "+251911234567",
    "customerId": {
      "name": "Abebe Bekele",
      "totalVisits": 4
    },
    "storeId": {
      "name": "Lewis Coffee - Bole",
      "tin": "0003169685",
      "branchName": "Bole",
      "minReceiptAmount": 500
    },
    "imageUrl": "/api/receipts/image/...",
    "ocrText": "LEWIS RETAIL\nTIN: 0003169685\n...",
    "tin": "0003169685",
    "invoiceNo": "04472-002-0011L",
    "dateOnReceipt": "2024-11-11",
    "totalAmount": 517.50,
    "branchText": "Lewis Coffee - Bole",
    "status": "flagged",
    "reason": "Low parsing confidence",
    "flags": ["Invoice number not found"],
    "createdAt": "2024-11-11T10:30:00.000Z"
  }
}
```

### 3. Review Receipt (Approve/Reject)

**Endpoint**: `POST /api/admin/receipts/:receiptId/review`  
**Auth**: Required  
**Roles**: admin, superadmin

**Approve Request**:
```json
POST /api/admin/receipts/673305f2e4b5c6789a0b1234/review

{
  "action": "approve",
  "notes": "Verified with customer - receipt is legitimate"
}
```

**Approve Response (200)**:
```json
{
  "success": true,
  "message": "Receipt approved and visit recorded",
  "data": {
    "receiptId": "673305f2e4b5c6789a0b1234",
    "visitId": "673305f2e4b5c6789a0b1235",
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
  "reason": "Receipt appears edited or not genuine",
  "notes": "Text alignment is suspicious"
}
```

**Reject Response (200)**:
```json
{
  "success": true,
  "message": "Receipt rejected",
  "data": {
    "receiptId": "673305f2e4b5c6789a0b1234"
  }
}
```

### 4. Get Receipt Settings

**Endpoint**: `GET /api/admin/store/receipt-settings`  
**Auth**: Required  
**Roles**: admin, superadmin

**Request (Admin)**:
```
GET /api/admin/store/receipt-settings
Cookie: auth-token=...
```

**Request (Super Admin)**:
```
GET /api/admin/store/receipt-settings?storeId=507f...
Cookie: auth-token=...
```

**Response (200)**:
```json
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

### 5. Update Receipt Settings

**Endpoint**: `PUT /api/admin/store/receipt-settings`  
**Auth**: Required  
**Roles**: admin, superadmin

**Request**:
```json
PUT /api/admin/store/receipt-settings
Cookie: auth-token=...

{
  "storeId": "507f...",  // Required for superadmin
  "tin": "0003169685",
  "branchName": "Bole",
  "minReceiptAmount": 600,
  "receiptValidityHours": 48,
  "allowReceiptUploads": true
}
```

**Response (200)**:
```json
{
  "success": true,
  "message": "Receipt settings updated successfully",
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

## Authentication

### JWT Cookie Authentication

Protected endpoints require JWT token in HTTP-only cookie:

```
Cookie: auth-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**How to get token**:
```bash
# Login as admin
curl -X POST http://localhost:3000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin1@lewisloyalty.com","password":"admin123"}' \
  -c cookies.txt

# Use cookies in subsequent requests
curl http://localhost:3000/api/admin/receipts \
  -b cookies.txt
```

### Role-Based Access

**Admin**:
- Can only see/manage receipts from their assigned store
- Cannot change storeId in requests

**Super Admin**:
- Can see/manage receipts from all stores
- Can filter by any storeId
- Can update settings for any store

---

## Error Codes

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Receipt approved |
| 202 | Accepted (processing) | Receipt flagged for review |
| 400 | Bad Request | Invalid file type, missing field |
| 401 | Unauthorized | No auth token provided |
| 403 | Forbidden | Admin accessing wrong store |
| 404 | Not Found | Receipt/store not found |
| 500 | Internal Server Error | Database error, OCR failure |

### Error Response Format

```json
{
  "error": "Short error message",
  "message": "Detailed error explanation"
}
```

### Common Errors

**Upload Errors**:
```json
{ "error": "No file provided. Expected field name: 'file'" }
{ "error": "File too large. Maximum size: 8MB" }
{ "error": "Invalid file type. Allowed: .jpg, .jpeg, .png, .heic" }
{ "error": "Store ID is required" }
```

**Validation Errors**:
```json
{ "reason": "TIN mismatch (expected: 0003169685, found: 9999999999)" }
{ "reason": "Amount 450 is below minimum 500" }
{ "reason": "Receipt is 2 days old (max: 1 days)" }
{ "reason": "This receipt has already been submitted" }
```

**Auth Errors**:
```json
{ "error": "Unauthorized" }
{ "error": "You can only review receipts from your store" }
{ "error": "Admin user has no assigned store" }
```

---

## Examples

### Example 1: Customer Upload Flow

```bash
# Step 1: Upload receipt
curl -X POST http://localhost:3000/api/receipts/upload \
  -F "file=@receipt.jpg" \
  -F "storeId=507f1f77bcf86cd799439011" \
  -F "phone=+251911234567"

# Response:
{
  "success": true,
  "status": "approved",
  "message": "🎉 Receipt approved - Reward earned!",
  "data": {
    "receiptId": "673305f2e4b5c6789a0b1234",
    "visitId": "673305f2e4b5c6789a0b1235",
    "visitCount": 5,
    "rewardEarned": true
  }
}

# Step 2: (Optional) Check status later
curl http://localhost:3000/api/receipts/status/673305f2e4b5c6789a0b1234

# Step 3: View receipt image
curl http://localhost:3000/api/receipts/image/507f.../1731345678901-a3f5c2d8.jpg \
  --output downloaded-receipt.jpg
```

### Example 2: Admin Review Flow

```bash
# Step 1: Login as admin
curl -X POST http://localhost:3000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin1@lewisloyalty.com","password":"admin123"}' \
  -c cookies.txt

# Step 2: List flagged receipts
curl http://localhost:3000/api/admin/receipts?status=flagged \
  -b cookies.txt

# Step 3: Get receipt details
curl http://localhost:3000/api/admin/receipts/673305.../review \
  -b cookies.txt

# Step 4: Approve receipt
curl -X POST http://localhost:3000/api/admin/receipts/673305.../review \
  -H "Content-Type: application/json" \
  -d '{"action":"approve","notes":"Verified"}' \
  -b cookies.txt
```

### Example 3: Settings Management

```bash
# Get current settings
curl http://localhost:3000/api/admin/store/receipt-settings \
  -b cookies.txt

# Update settings
curl -X PUT http://localhost:3000/api/admin/store/receipt-settings \
  -H "Content-Type: application/json" \
  -d '{
    "tin": "0003169685",
    "branchName": "Bole",
    "minReceiptAmount": 600,
    "receiptValidityHours": 48,
    "allowReceiptUploads": true
  }' \
  -b cookies.txt
```

---

## Receipt Status Values

| Status | Meaning | Customer Action | Visit Counted |
|--------|---------|----------------|---------------|
| `pending` | Processing | Wait | ❌ Not yet |
| `approved` | Valid receipt | View reward | ✅ Yes |
| `rejected` | Rule violation | Retake photo | ❌ Never |
| `flagged` | Needs review | Wait or retake | ⚠️ If admin approves |
| `flagged_manual_requested` | Review requested | Wait for admin | ⚠️ If admin approves |

---

## Validation Rules

### What Gets Auto-Approved ✅

Receipt must satisfy ALL:
- ✅ Store is active and allows receipt uploads
- ✅ TIN matches store's TIN exactly
- ✅ Branch name found in receipt text
- ✅ Amount >= store's minimum amount
- ✅ Date within store's validity window (default: 24 hours)
- ✅ Invoice number is unique (not previously used)
- ✅ Barcode is unique (if present)
- ✅ OCR confidence is high or medium
- ✅ All critical fields extracted (TIN, invoice, date, amount)

### What Gets Auto-Rejected ❌

Receipt is rejected if ANY:
- ❌ TIN doesn't match (wrong store)
- ❌ Date too old (outside validity window)
- ❌ Amount below minimum
- ❌ Invoice number already used
- ❌ Barcode already used
- ❌ Store is inactive
- ❌ Uploads are disabled for store

### What Gets Flagged ⚠️

Receipt is flagged if ANY:
- ⚠️ OCR confidence is low (<60%)
- ⚠️ Critical field missing (TIN, invoice, date, amount)
- ⚠️ OCR extracted very little text (<20 characters)
- ⚠️ OCR processing error

---

## Postman Collection

Import this into Postman for easy testing:

```json
{
  "info": {
    "name": "Lewis Loyalty - Receipt APIs",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Upload Receipt",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/receipts/upload",
        "body": {
          "mode": "formdata",
          "formdata": [
            { "key": "file", "type": "file", "src": "" },
            { "key": "storeId", "value": "507f1f77bcf86cd799439011" },
            { "key": "phone", "value": "+251911234567" }
          ]
        }
      }
    },
    {
      "name": "Check Status",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/receipts/status/{{receiptId}}"
      }
    },
    {
      "name": "Admin - List Receipts",
      "request": {
        "method": "GET",
        "url": "{{baseUrl}}/api/admin/receipts?status=flagged"
      }
    },
    {
      "name": "Admin - Approve Receipt",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/admin/receipts/{{receiptId}}/review",
        "body": {
          "mode": "raw",
          "raw": "{\n  \"action\": \"approve\",\n  \"notes\": \"Verified\"\n}"
        }
      }
    }
  ],
  "variable": [
    { "key": "baseUrl", "value": "http://localhost:3000" }
  ]
}
```

---

## Rate Limiting (Recommended)

**To implement** (add to upload endpoint):

```typescript
// Track uploads per IP
const uploads = new Map<string, number[]>();

export async function POST(request: NextRequest) {
  const ip = request.ip || 'unknown';
  const now = Date.now();
  
  // Get recent uploads
  const recent = uploads.get(ip) || [];
  const recentCount = recent.filter(t => now - t < 60000).length;
  
  // Rate limit: 10 uploads per minute
  if (recentCount >= 10) {
    return NextResponse.json(
      { error: 'Too many uploads. Please try again later.' },
      { status: 429 }
    );
  }
  
  // Record upload
  uploads.set(ip, [...recent, now]);
  
  // Continue with upload...
}
```

---

## Webhooks (Future Enhancement)

**Notify customers when receipt is reviewed**:

```json
POST https://customer-webhook-url.com

{
  "event": "receipt.reviewed",
  "data": {
    "receiptId": "...",
    "status": "approved",
    "visitCounted": true,
    "phone": "+251911234567"
  }
}
```

---

## Summary

**6 API Endpoints Created**:
- 3 Customer APIs (public)
- 3 Admin APIs (protected)

**Features**:
- Complete CRUD operations
- Authentication & authorization
- Pagination & filtering
- Statistics & analytics
- Audit trail
- Error handling

**Ready for frontend integration!** ✅

---

**Next**: Phase 6 - Customer Frontend UI

