# 🎁 Lewis Retails Loyalty Reward System - Complete Explanation

## 📋 Overview

The Lewis Retails Loyalty Program rewards customers with **10% discount coupons** after they complete **5 approved visits** (via receipt upload or QR scan) within a **45-day period**. The system automatically tracks visits, validates receipts, and manages reward lifecycle.

---

## 🔄 Complete Reward Flow

### **Phase 1: Customer Registration & Authentication**

1. **Customer Signs Up/Logs In**
   - Customer enters phone number (+251 format)
   - System checks if customer exists
   - If new: Customer registers with name
   - If existing: Customer signs in (name auto-filled)

2. **Customer Dashboard Access**
   - After login, customer sees their dashboard
   - Shows current visit progress (X/5 visits)
   - Displays active rewards if any

---

### **Phase 2: Visit Recording Methods**

Customers can record visits in **two ways**:

#### **Method 1: Receipt Upload** 📸
1. Customer clicks "Upload Receipt" or "Open Camera"
2. Selects store from list
3. Camera opens (or file picker) - **No overlays for better image quality**
4. Customer takes photo of receipt or uploads image
5. System processes receipt through validation pipeline

#### **Method 2: QR Code Scan** 📱
1. Customer scans store QR code
2. Visit is instantly recorded (no validation needed)

**Important**: Only **one visit per 24 hours** is allowed (rolling 24-hour window)

---

### **Phase 3: Receipt Validation Process** (For receipt uploads)

When a receipt is uploaded, the system goes through **13 validation steps**:

#### **Step 1: OCR (Optical Character Recognition)**
- Extracts text from receipt image
- Validates that image is actually a receipt (checks for keywords like "TIN", "INVOICE", "RECEIPT")
- Rejects if image quality is too poor or not a receipt

#### **Step 2: Store Identification**
- Extracts TIN (Tax Identification Number) from receipt
- **Only TIN `0003169685` is accepted** (Lewis Retails stores)
- Finds store in database by TIN
- Rejects receipts from other stores

#### **Step 3: Receipt Parsing**
- Extracts key fields:
  - TIN
  - Invoice Number
  - Date
  - Total Amount
  - Branch Name
  - Barcode Data

#### **Step 4: Validation Checks**
- **TIN Match**: Must match store TIN (`0003169685`)
- **Minimum Amount**: Receipt must be ≥ 2,000 ETB
- **Age Check**: Receipt must be within 24 hours old (configurable per store)
- **Store Status**: Store must be active and allow receipt uploads

#### **Step 5: Fraud Detection**
- Analyzes image for tampering/editing
- Checks for AI-generated receipts
- Calculates fraud score (0-100)
  - Score > 70: **Auto-rejected**
  - Score > 40: **Flagged for manual review**

#### **Step 6: Duplicate Check**
- Checks if invoice number was already used (any status)
- Checks if barcode was already scanned (approved/pending status)
- Rejects duplicates immediately

#### **Step 7: 24-Hour Visit Limit**
- Checks if customer already has an **approved receipt** within last 24 hours
- Rejects if limit exceeded (prevents spam)

#### **Step 8: Manual Review Flags**
- Low parsing confidence → Flagged
- Missing critical fields → Flagged
- Requires admin manual review

#### **Step 9: Receipt Approval**
- If all checks pass: Receipt status = `approved`
- Creates receipt record in database
- Saves image to storage

#### **Step 10: Customer & Visit Creation**
- Finds or creates customer record
- Creates **Visit** record (linked to receipt)
- Updates customer's `totalVisits` count
- Updates customer's `lastVisit` timestamp

#### **Step 11: Reward Eligibility Check**
- Counts **approved receipts within last 45 days**
- Calculates if customer has **5 visits within period**
- Checks if customer already has active reward (pending/claimed/redeemed)

#### **Step 12: Reward Creation (If Eligible)**
- If customer has **5 visits within 45 days** AND no active reward:
  - Creates **Reward** with status = `claimed` (automatically claimed)
  - Reward type: "10% Discount on Next Purchase"
  - Expires in 45 days from creation
  - Marks visit as `rewardEarned = true`

#### **Step 13: Response to Customer**
- Returns success/error message
- Shows visit count
- Shows reward earned status
- Shows progress (X/5 visits)

---

### **Phase 4: Reward Lifecycle States**

Rewards go through **5 distinct states**:

#### **1. `pending`** (Not used in current flow)
- Legacy state - not actively used
- Customer has 5 visits but reward not yet claimed

#### **2. `claimed`** ⭐ **Current Starting State**
- **Reward is automatically created with this status**
- Customer completed 5 visits within 45 days
- Reward button is **clickable** on customer dashboard
- Customer can view reward details
- Reward expires in 45 days from creation

#### **3. `redeemed`** 🔄
- Admin processes the reward
- Admin clicks "Redeem" button in admin dashboard
- System generates:
  - **QR Code** (for scanning at store)
  - **Discount Code** (e.g., `DISC123456`)
  - **Discount Percent**: 10% (default)
- Reward expiration extended to **30 days from redemption**
- Reward button still **clickable** (customer can view QR code)

#### **4. `used`** ✅
- Admin scans QR code at store checkout
- Reward status changes to `used`
- Reward button becomes **gray and unclickable** on customer dashboard
- Reward moves to "History" section
- Customer can still **view and share** discount card from history

#### **5. `expired`** ⏰
- Reward passed expiration date without being used
- No longer redeemable
- Shown in history

**Important**: Once a reward is `used`, the customer can earn a **new reward** after completing another 5 visits (no reset needed - visits continue in rolling 45-day window).

---

### **Phase 5: Reward Period Management**

The system uses a **rolling 45-day period** system:

1. **Period Start**: First approved receipt timestamp
2. **Period End**: Start date + 45 days
3. **Period Expiration**: If 45 days pass without 5 visits, period expires
4. **New Period**: When period expires, new period starts from most recent receipt

**Key Features**:
- Visits don't reset - they continue in rolling window
- Customer sees progress: "X/5 visits within 45 days"
- Shows days remaining until period expires
- After reward is earned, customer can earn another reward with 5 more visits

---

### **Phase 6: Admin Reward Processing**

Admins manage rewards through the admin dashboard:

#### **Reward States in Admin Dashboard**:

1. **`claimed`** Rewards:
   - Customer earned reward (5 visits completed)
   - Admin clicks "Redeem" button
   - System generates QR code and discount code
   - Status changes to `redeemed`

2. **`redeemed`** Rewards:
   - QR code is ready for customer
   - Admin can scan QR code when customer uses discount
   - Status changes to `used` after scanning

3. **`used`** Rewards:
   - Already scanned and used
   - Cannot be scanned again
   - Shows error: "DiscountCard is used"

---

## 🎯 Key Rules & Constraints

### **Visit Rules**:
1. ✅ Only **one visit per 24 hours** (rolling window)
2. ✅ Only **approved receipts** count as visits
3. ✅ Rejected/flagged receipts **don't count** as visits
4. ✅ Both QR scans and receipt uploads count as visits

### **Receipt Validation Rules**:
1. ✅ Only TIN `0003169685` accepted (Lewis Retails stores)
2. ✅ Minimum receipt amount: **2,000 ETB**
3. ✅ Receipt must be within **24 hours** old
4. ✅ No duplicate invoice numbers
5. ✅ No duplicate barcodes

### **Reward Rules**:
1. ✅ **5 approved visits within 45 days** = 1 reward
2. ✅ Reward automatically **claimed** (no manual claim button)
3. ✅ Only **one active reward** at a time (must use before earning new one)
4. ✅ Reward expires in **45 days** from creation (before redemption)
5. ✅ Reward expires in **30 days** from redemption (after QR code generated)

### **Period Management**:
1. ✅ 45-day rolling period starts from first visit
2. ✅ Period expires if 45 days pass without 5 visits
3. ✅ New period starts from most recent receipt after expiration
4. ✅ Visits don't reset - continue in rolling window

---

## 📊 Customer Dashboard Features

### **Main Dashboard** (`/dashboard/customer`):

1. **Visit Progress**:
   - Shows "X/5 visits within 45 days"
   - Progress bar visualization
   - Days remaining until period expires

2. **Reward Button**:
   - **Clickable** (orange) when reward status is `claimed` or `redeemed`
   - **Gray/Disabled** when reward status is `used`
   - Opens discount card modal with QR code

3. **Receipt Upload**:
   - "Open Camera" button (color: `#FF701A`)
   - "Upload Receipt" button
   - Auto-opens camera/file picker after store selection

4. **Visit Count Display**:
   - Shows total visits
   - Shows visits in current 45-day period

---

## 🔔 Notification System

The system sends push notifications for:

1. **Receipt Approved**: "Your receipt was approved! Visit counted."
2. **Receipt Rejected**: Detailed rejection reason
3. **Receipt Flagged**: "Your receipt needs review. We'll notify you soon."
4. **Reward Earned**: "🎉 Congratulations! You earned a 10% discount reward!"
5. **Motivation** (Every 3 days): Encourages visits and discounts
6. **Expiry Reminder** (Every 15 days): Reminds about 45-day period expiration

---

## 🗄️ Database Models

### **Customer**:
- `name`: Customer name
- `phone`: Phone number (+251 format)
- `totalVisits`: Total approved visits (lifetime)
- `lastVisit`: Last visit timestamp

### **Receipt**:
- `customerPhone`: Customer phone number
- `storeId`: Store reference
- `imageUrl`: Receipt image path
- `status`: `approved` | `rejected` | `flagged`
- `tin`: Extracted TIN
- `invoiceNo`: Invoice number
- `totalAmount`: Receipt amount
- `processedAt`: Processing timestamp

### **Visit**:
- `customerId`: Customer reference
- `storeId`: Store reference
- `receiptId`: Receipt reference (if via receipt)
- `visitMethod`: `qr` | `receipt`
- `timestamp`: Visit timestamp
- `rewardEarned`: Boolean (true if reward earned on this visit)

### **Reward**:
- `customerId`: Customer reference
- `storeId`: Store reference
- `code`: Unique reward code
- `status`: `pending` | `claimed` | `redeemed` | `used` | `expired`
- `issuedAt`: Creation timestamp
- `expiresAt`: Expiration timestamp
- `claimedAt`: When status became claimed
- `redeemedAt`: When admin redeemed (generated QR code)
- `usedAt`: When admin scanned QR code
- `qrCode`: QR code data (JSON string)
- `discountCode`: Discount code (e.g., `DISC123456`)
- `discountPercent`: 10% (default)

---

## 🚀 System Architecture

### **Frontend** (Next.js):
- Customer dashboard (`/dashboard/customer`)
- Receipt upload page (`/customer-receipt`)
- Rewards history page (`/dashboard/customer/rewards`)
- Auth page (`/customer-auth`)

### **Backend API Routes**:
- `/api/receipts/upload` - Receipt upload and validation
- `/api/customer/rewards/status` - Get reward progress
- `/api/admin/rewards/[rewardId]/redeem` - Admin redeem reward
- `/api/admin/rewards/[rewardId]/scan` - Admin scan QR code
- `/api/admin/receipts/[receiptId]/review` - Admin review flagged receipts

### **Core Services**:
- `lib/receiptValidator.ts` - Main receipt validation logic
- `lib/rewardStatusHelper.ts` - Reward status calculation
- `lib/pushNotifications.ts` - Push notification sending
- `lib/scheduledNotifications.ts` - Scheduled notifications (cron)

---

## 📱 User Experience Flow Examples

### **Example 1: New Customer Journey**

1. Customer registers with phone + name
2. Customer uploads first receipt → Approved → Visit 1/5
3. Customer uploads second receipt → Approved → Visit 2/5
4. Customer uploads third receipt → Approved → Visit 3/5
5. Customer uploads fourth receipt → Approved → Visit 4/5
6. Customer uploads fifth receipt → Approved → **Reward automatically claimed!**
7. Reward button becomes clickable
8. Customer views discount card with QR code
9. Admin redeems reward (generates QR code)
10. Customer goes to store, shows QR code
11. Admin scans QR code → Reward status = `used`
12. Reward button becomes gray
13. Reward moves to history (customer can still view/share)

### **Example 2: Period Expiration**

1. Customer has 3/5 visits
2. 45 days pass without completing 5 visits
3. Period expires
4. New period starts from most recent receipt
5. Customer progress resets (but can still earn reward with 5 more visits)

### **Example 3: Used Reward → New Reward**

1. Customer has used reward (status = `used`)
2. Customer uploads receipt → Visit 1/5 (new period)
3. Customer continues visiting...
4. After 5 more visits → New reward automatically claimed!

---

## 🔒 Security Features

1. **Fraud Detection**: AI-powered image analysis
2. **Duplicate Prevention**: Invoice number and barcode uniqueness
3. **24-Hour Limit**: Prevents spam/abuse
4. **TIN Validation**: Only accepts valid store TIN
5. **Amount Validation**: Minimum receipt amount enforcement
6. **Age Validation**: Receipt freshness check

---

## 📈 Analytics & Tracking

- Total visits per customer
- Visit method (QR vs Receipt)
- Reward redemption rate
- Period expiration tracking
- Fraud detection scores
- Receipt approval/rejection rates

---

This system ensures a fair, transparent, and automated loyalty program that rewards genuine customer visits while preventing fraud and abuse.



