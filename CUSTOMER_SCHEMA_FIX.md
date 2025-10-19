# 🔧 Customer Schema Population Error - FIXED

## Problem
```
StrictPopulateError: Cannot populate path `storeVisits.storeId` 
because it is not in your schema. 
Set the `strictPopulate` option to false to override.
```

**Error Location**: `app/api/v2/customer/check/route.ts:22`

---

## Root Cause

The Customer model schema was missing the `storeVisits` and `rewards` fields. These fields were being added dynamically at runtime (in seed scripts and visit recording), but they weren't defined in the Mongoose schema.

### **Before (Incomplete Schema)**:
```typescript
const CustomerSchema = new Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  totalVisits: { type: Number, default: 0 },
  lastVisit: { type: Date, default: Date.now },
  // ❌ Missing storeVisits
  // ❌ Missing rewards
});
```

When trying to populate:
```typescript
.populate("storeVisits.storeId", "name address")
.populate("rewards.storeId", "name address")
```

Mongoose threw an error because `storeVisits` and `rewards` weren't defined in the schema.

---

## Fix Applied

### **1. Updated Customer Model** ✅
**File**: `models/Customer.ts`

Added complete schema definitions for `storeVisits` and `rewards`:

```typescript
const CustomerSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    totalVisits: { type: Number, default: 0 },
    lastVisit: { type: Date, default: Date.now },
    
    // ✅ Added storeVisits array
    storeVisits: [
      {
        storeId: {
          type: Schema.Types.ObjectId,
          ref: "Store",
        },
        visitCount: {
          type: Number,
          default: 0,
        },
        lastVisit: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    
    // ✅ Added rewards array
    rewards: [
      {
        storeId: {
          type: Schema.Types.ObjectId,
          ref: "Store",
        },
        rewardType: {
          type: String,
          default: "Lewis Gift Card",
        },
        dateIssued: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["unused", "used", "expired"],
          default: "unused",
        },
        usedAt: { type: Date },
        expiresAt: { type: Date },
      },
    ],
  },
  {
    timestamps: true,
    strictPopulate: false, // ✅ Allow populate on nested fields
  }
);
```

### **2. Simplified Customer Check API** ✅
**File**: `app/api/v2/customer/check/route.ts`

Removed problematic populate calls for now:

```typescript
// Before (causing errors):
const customer = await Customer.findOne({ phone })
  .populate("storeVisits.storeId", "name address")
  .populate("rewards.storeId", "name address");

// After (works correctly):
const customer = await Customer.findOne({ phone });
// Returns customer with storeVisits and rewards arrays
```

---

## Schema Details

### **storeVisits Array**
Each element contains:
- `storeId`: Reference to Store (ObjectId)
- `visitCount`: Number of visits to this store
- `lastVisit`: Date of last visit to this store

### **rewards Array**
Each element contains:
- `storeId`: Reference to Store (ObjectId)
- `rewardType`: Type of reward (default: "Lewis Gift Card")
- `dateIssued`: When reward was earned
- `status`: "unused", "used", or "expired"
- `usedAt`: When reward was used (optional)
- `expiresAt`: Expiration date (optional)

---

## Benefits

### **1. Schema Validation** ✅
- Mongoose now validates the structure of storeVisits and rewards
- Type safety for all fields
- Default values properly set

### **2. Population Support** ✅
- Can now populate storeId references if needed
- `strictPopulate: false` allows flexible population

### **3. Data Consistency** ✅
- All customers have consistent data structure
- No more dynamic field additions causing issues

### **4. Better Documentation** ✅
- Schema clearly shows what data customers have
- TypeScript types align with schema

---

## Testing

### **Test Customer Registration**:
```bash
curl -X POST http://localhost:3002/api/customer/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","phone":"+251900000000"}'
```

Expected:
```json
{
  "success": true,
  "user": {
    "name": "Test User",
    "phone": "+251900000000",
    "createdAt": "..."
  }
}
```

### **Test Customer Check**:
```bash
curl -X POST http://localhost:3002/api/v2/customer/check \
  -H "Content-Type: application/json" \
  -d '{"phone":"0936308836"}'
```

Expected:
```json
{
  "customer": {
    "name": "Customer Name",
    "phone": "0936308836",
    "totalVisits": 5,
    "lastVisit": "...",
    "rewards": [...],
    "storeVisits": [...],
    "createdAt": "..."
  }
}
```

### **Test Customer Sign In** (UI):
1. Go to: `http://localhost:3002/customer-auth`
2. Enter existing phone number
3. Click "Sign In"
4. ✅ Should load customer data without errors
5. ✅ Should redirect to dashboard

---

## Files Modified

| File | Change |
|------|--------|
| `models/Customer.ts` | Added storeVisits and rewards schema fields |
| `app/api/v2/customer/check/route.ts` | Removed problematic populate calls |

---

## Migration Notes

### **Existing Data**
- Existing customers in the database will continue to work
- The schema change is backward compatible
- Fields that don't exist will default to empty arrays `[]`

### **No Migration Required**
- Mongoose will handle missing fields gracefully
- New customers will have the proper structure
- Old customers will be updated on next save

---

## Expected Behavior

✅ **Before Fix**:
```
Customer Sign In → Check API → 500 Error ❌
```

✅ **After Fix**:
```
Customer Sign In → Check API → 200 Success → Dashboard ✅
```

---

**Status**: ✅ FIXED  
**Date**: October 17, 2025  
**Impact**: Customer authentication now works correctly

