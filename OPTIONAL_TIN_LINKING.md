# Optional TIN Linking & Auto-Detection Feature

## Overview

The system now supports **optional TIN (Tax Identification Number) linking** with stores. This enables automatic store detection from receipt TINs, improving customer experience.

## Current Implementation

### 1. Store TIN Field (Optional)
- Stores can have a TIN number linked (field: `tin?: string`)
- TIN linking is **completely optional** - stores can exist without TIN
- Multiple stores can share the same TIN (for future branch support)

### 2. Customer Flow Options

#### Option A: Manual Store Selection (Current Default)
- Customer selects store from list before uploading receipt
- Works for all stores regardless of TIN configuration

#### Option B: Skip Store Selection (Auto-Detection)
- Customer can skip store selection
- System automatically detects store from receipt TIN during validation
- Only works if:
  - Receipt TIN is extracted successfully
  - Store with matching TIN exists in database
  - Store is active and allows receipt uploads

### 3. Backend Auto-Detection Logic

When `storeId` is not provided in receipt upload:
1. System extracts TIN from receipt (OCR)
2. Validates TIN against allowed TINs (from SystemSettings)
3. Searches for store with matching TIN: `Store.findOne({ tin: extractedTIN })`
4. If found:
   - Checks store is active
   - Checks store allows receipt uploads
   - Uses that store for validation
5. If not found:
   - Flags receipt for manual review
   - Admin can assign correct store later

## User Interface Changes

### Store Selection Page
- Shows list of available stores (as before)
- **New:** "Skip Store Selection" button at bottom
- When skipped, shows: "Store Auto-Detection Enabled"
- Customer can proceed directly to camera/upload

### Upload View
- If store selected: Shows store name in orange badge
- If skipped: Shows "Store Auto-Detection Enabled" in blue badge
- ReceiptUploader works with or without `storeId` prop

## Future Considerations

### Multiple Stores with Same TIN
Currently, if multiple stores share the same TIN, the system will use the first one found. Future enhancements could:
- Use branch name matching (if available in receipt)
- Show customer a selection prompt if multiple stores match
- Use additional receipt data (address, phone) for matching

### Smart Default Selection
- If customer has history, auto-select most frequent store
- Remember last selected store per customer
- Suggest store based on location (if GPS available)

## Configuration

### Superadmin Rules & Constraints
- **Allowed TINs**: Configure which TINs are accepted system-wide
- Stores with TINs outside allowed list will be rejected
- Multiple TINs can be configured (e.g., different store chains)

### Store Settings
- TIN is optional per store
- Stores without TIN: Must be manually selected by customer
- Stores with TIN: Can be auto-detected from receipt

## Testing

To test auto-detection:
1. Ensure store has TIN configured in database
2. Upload receipt with matching TIN
3. Skip store selection
4. System should automatically detect and use correct store

To test without TIN:
1. Use store without TIN configuration
2. Customer must manually select store
3. Receipt validation proceeds normally

## Implementation Notes

### Current Status
- ✅ Store TIN field is optional (already in Store model)
- ✅ Store selection can be skipped
- ✅ Backend auto-detection logic exists
- ✅ ReceiptUploader supports optional storeId
- ⏳ SystemSettings integration (Phase 4) will replace hardcoded TIN validation

### Next Steps (Phase 4)
1. Replace hardcoded `ALLOWED_TIN = '0003169685'` with SystemSettings
2. Support multiple allowed TINs from settings
3. Update validation to use system settings instead of hardcoded values

## Benefits

1. **Better UX**: Customers can skip manual store selection if TIN is linked
2. **Flexibility**: Stores without TIN still work (manual selection)
3. **Scalability**: Supports future multi-store/branch scenarios
4. **Error Reduction**: Auto-detection reduces customer errors in store selection

