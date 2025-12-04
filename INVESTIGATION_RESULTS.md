# Investigation Results - Multi-Store TIN & Customer Sharing

## Current Implementation Status

### 1. Multiple Stores with Same TIN
**Status: ❌ NOT IMPLEMENTED**
- Currently uses `Store.findOne({ tin: extractedTIN })` - only finds ONE store
- If multiple stores share TIN, only first store is found
- Need to change to `Store.find({ tin: extractedTIN })` to get ALL stores
- Then show store selection UI with only stores sharing that TIN

### 2. Customer Visits Across Stores
**Status: ✅ PARTIALLY IMPLEMENTED**
- Visit model has `storeId` - visits are store-specific ✓
- Reward eligibility counts visits across ALL stores (no storeId filter) ✓
- Customer can buy from different stores and get visit counts ✓
- **Issue**: Reward is created with `storeId` - rewards are store-specific
- **Issue**: Existing reward check filters by `customerId` AND `storeId`
- This means customer could have multiple rewards from different stores
- **Question**: Should rewards be store-specific or usable at any store?

### 3. Admin Customer Visibility (Mutual Customers)
**Status: ✅ IMPLEMENTED**
- Admin customers API filters by storeId in visits lookup
- Only shows customers who visited that admin's store
- Admins share customers (if customer visited multiple stores, multiple admins see them)
- Admins don't see other admins (each admin only sees their store's customers) ✓
- **Confirmed**: Implementation is correct

### 4. Reward Scanning Across Stores
**Status: ✅ IMPLEMENTED**
- Reward scan API has NO store restriction
- Any admin can scan any reward QR code ✓
- Customer can get discount from any store ✓
- **Confirmed**: Implementation is correct

### 5. Superadmin Reward Tracking
**Status: ❌ NOT FULLY IMPLEMENTED**
- Reward model has `storeId` (where reward was created)
- But missing: which admin/store scanned the reward
- Need to add: `usedByAdminId`, `usedByStoreId`, `usedAtStoreId` fields
- Superadmin rewards API should show where reward was used

### 6. Admin Reward History
**Status: ❌ NOT IMPLEMENTED**
- Admin rewards API filters by `storeId` - only shows rewards for their store
- Missing: Track which admin scanned which reward
- Missing: Admin-specific reward history showing all rewards they scanned
- Need: Reward history showing which admin gave discount to which customer

## Required Changes

### Priority 1: Multiple Stores with Same TIN
1. Change `Store.findOne()` to `Store.find()` when TIN matches multiple stores
2. Return list of stores with matching TIN
3. Show store selection UI with only those stores
4. Update link-store API to handle this

### Priority 2: Reward Tracking Enhancements
1. Add fields to Reward model:
   - `usedByAdminId` - Which admin scanned the reward
   - `usedAtStoreId` - Which store the reward was used at
2. Update reward scan API to track these fields
3. Add admin reward history API endpoint
4. Update superadmin analytics to show reward usage locations

### Priority 3: Admin Reward History Page
1. Create API endpoint: `/api/admin/rewards/history`
   - Shows all rewards scanned by this admin
   - Shows which customers received discounts
   - Shows when rewards were scanned
2. Update admin rewards page to include history tab
3. Show reward usage analytics

## Questions to Clarify

1. **Reward Store Association**: Should rewards be store-specific (can only use at created store) or universal (can use at any store)? Currently they're store-specific but can be scanned anywhere.

2. **Visit Counting**: Currently visits from ALL stores count towards reward eligibility. Is this correct? Should it be per-store or global?

3. **Reward Creation**: Currently reward is created with `storeId`. Should it be store-agnostic (no storeId) since it can be used anywhere?

