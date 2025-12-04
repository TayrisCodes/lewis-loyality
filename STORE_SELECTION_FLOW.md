# Store Selection Flow - TIN Not Linked

## Overview

When a receipt is uploaded but the TIN number is not linked to any store, the system now requires the customer to manually select the store before completing validation.

## Flow

### 1. Receipt Upload (No Store Selected or TIN Not Linked)
- Customer uploads receipt without selecting store (or skips store selection)
- System extracts TIN from receipt
- System tries to find store by TIN

### 2. Store Not Found by TIN
- If no store matches the TIN:
  - Receipt is created with status: `pending`
  - Flag: `['Store selection needed']`
  - Response status: `needs_store_selection`
  - Receipt ID and extracted TIN are returned

### 3. Store Selection UI
- ReceiptUploader detects `needs_store_selection` status
- Shows store selection interface:
  - Blue info banner: "Store Selection Required"
  - Displays extracted TIN number
  - Lists all available stores (active + allow receipt uploads)
  - Customer can click a store to select

### 4. Store Linking
- When customer selects a store:
  - API call to `/api/receipts/link-store`
  - Receipt is linked to selected store
  - Validation is re-run with store ID
  - Full validation process executes:
    - Amount validation
    - Age validation
    - Duplicate checks
    - Fraud detection
    - Visit limits
    - Reward eligibility

### 5. Validation Completion
- If validation succeeds:
  - Receipt status: `approved` or `flagged`
  - Visit is counted
  - Reward may be earned
  - Success message shown
  - Process completes and closes

- If validation fails:
  - Receipt status: `rejected` or `flagged`
  - Rejection reason shown
  - Customer can retry if allowed

## Key Features

### Optional Store Selection
- Customer can skip store selection initially
- System attempts auto-detection from TIN
- Falls back to manual selection if TIN not linked

### Forced Store Selection
- **Cannot complete without selecting store**
- Store selection UI is shown after validation
- Process doesn't close until store is selected
- After selection, validation completes and closes

### Error Handling
- If store selection fails → Error shown, can retry
- If validation fails after linking → Rejection shown
- Customer can retry with different store if needed

## API Endpoints

### POST `/api/receipts/link-store`
Links a receipt to a selected store and completes validation.

**Request:**
```json
{
  "receiptId": "receipt_id_here",
  "storeId": "store_id_here",
  "customerPhone": "+251911223344"
}
```

**Response (Success):**
```json
{
  "success": true,
  "status": "approved",
  "reason": "Receipt approved and visit recorded",
  "receiptId": "...",
  "visitCount": 3,
  "rewardEarned": false,
  "data": { ... }
}
```

**Response (Failure):**
```json
{
  "success": false,
  "status": "rejected",
  "reason": "Receipt amount below minimum",
  "rejectionDetails": [ ... ],
  "receiptId": "..."
}
```

## Database Changes

### Receipt Status Flow
1. `pending` - Initial status when store not found by TIN
2. `approved` - After store selection and successful validation
3. `rejected` - After store selection but validation failed
4. `flagged` - After store selection but needs manual review

### Receipt Flags
- `['Store selection needed']` - Indicates receipt is waiting for store selection

## UI Components

### ReceiptUploader Changes
- New state: `needsStoreSelection`
- New state: `availableStores`
- New state: `extractedTIN`
- New state: `pendingReceiptId`
- Store selection UI component
- Store linking handler

### Store Selection UI
- Blue info banner with TIN display
- Scrollable list of stores
- Store cards with name, branch, address
- Loading state during linking
- Error display if linking fails

## User Experience

### Scenario 1: TIN Linked
1. Upload receipt (skip store selection)
2. System auto-detects store from TIN
3. Validation completes automatically
4. Success message shown
5. Process closes

### Scenario 2: TIN Not Linked
1. Upload receipt (skip store selection)
2. System cannot find store by TIN
3. **Store selection UI appears**
4. Customer selects store
5. Validation runs with selected store
6. Result shown (approved/rejected/flagged)
7. **Process closes only after selection**

### Scenario 3: Manual Store Selection
1. Customer selects store before upload
2. Receipt uploaded with store ID
3. Validation runs immediately
4. Result shown
5. Process closes

## Benefits

1. **Flexibility**: Customers can skip store selection if TIN is linked
2. **Reliability**: Forces store selection when needed
3. **Error Prevention**: Cannot complete without proper store assignment
4. **Future-Ready**: Supports future multi-store/branch scenarios
5. **User-Friendly**: Clear messaging about what's needed

