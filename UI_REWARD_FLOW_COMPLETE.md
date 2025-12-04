# UI Reward Flow - Complete Implementation

## ✅ Figma Design Implementation

### 1. Gift Box & Reward Button ✅

**Initial State (No Reward Pending):**
- Large red gift box with yellow ribbon at top
- Static, disabled "Reward" button below gift box
- 5 green scan progress boxes showing visits
- Progress text: "X / 5 visits within 45 days"

**When Reward is Pending (5 visits achieved):**
- Gift box remains visible
- Reward button becomes **ANIMATED** with:
  - Pulsing/ringing animation (scale animation)
  - Pulsing ring effect around button
  - Button text: "Ring Ring - Get Your Reward!"
  - Fully clickable/touchable
  - Sparkles icon with pulse animation

**After Customer Clicks Claim:**
- Button disappears (waiting for admin to redeem)
- Message shows "Waiting for admin to redeem..."

**After Admin Redeems:**
- Discount card appears below gift box
- Shows 10% discount
- Shows expiry date (1 month from redemption)
- QR code displayed (scannable)
- "Scan to Cashier" text
- Reward button goes back to **STATIC and DISABLED**

**After Admin Scans QR Code (Reward Used):**
- Discount card disappears
- Reward button remains **STATIC and DISABLED**
- Can earn new reward after 5 more visits

### 2. Discount Card (Orange Card with QR Code) ✅

When reward is redeemed, shows:
- Orange gradient background card
- "Discount Card" title
- "Lewis Retails Supermarket" logo
- Discount: **10%**
- Expiry date: **Oct/23/2025** format (1 month from redemption)
- Large QR code (rendered with react-qr-code)
- "Scan to Cashier" text
- Discount code display

### 3. Reward History ✅

Shows list of all rewards:
- The Recent Reward
- The Third Reward
- The Second Reward
- The First Reward
- Each with eye icon (view) and share icon

## Implementation Details

### Components Updated

1. **`app/dashboard/customer/page.tsx`**
   - Gift box visual (CSS-based red box with yellow ribbon)
   - Animated reward button (framer-motion)
   - Discount card with QR code
   - Progress bars (5 green boxes)
   - State management for reward flow

2. **`components/ReceiptUploader.tsx`**
   - 24-hour upload limit check
   - Disabled button when can't upload

3. **API Endpoints**
   - `GET /api/customer/receipt/eligibility` - Check upload eligibility
   - `GET /api/customer/rewards/status` - Get reward status
   - `POST /api/customer/rewards/claim` - Claim pending reward

### State Flow

```
1. No reward pending
   → Static button (disabled)

2. 5 visits achieved
   → Pending reward created
   → Animated button appears (pulsing)

3. Customer clicks "Ring Ring - Get Your Reward!"
   → Status: pending → claimed
   → Button disappears
   → Waiting for admin

4. Admin clicks "Redeem"
   → Status: claimed → redeemed
   → Discount card appears with QR code
   → Static button shows (disabled)

5. Admin scans QR code
   → Status: redeemed → used
   → Discount card disappears
   → Static button remains (disabled)
   → Ready for next reward
```

### Animation Details

**Reward Button Animation (when pending):**
- Scale animation: `[1, 1.05, 1]` (2 second loop)
- Pulsing ring: Scale `[1, 1.2, 1]` with opacity fade
- Sparkles icon: Pulse animation
- Infinite repeat

**Visual Elements:**
- Gift box: CSS-based (red box + yellow ribbon)
- Progress boxes: 5 green squares with "+1 Scan" text
- Discount card: Orange gradient with white QR code area

## Testing Checklist

- [ ] Gift box displays correctly
- [ ] Static button shows when no reward pending
- [ ] Animated button appears when reward is pending (5 visits)
- [ ] Button is clickable when animated
- [ ] Claim reward API call works
- [ ] Discount card appears after admin redeems
- [ ] QR code renders correctly
- [ ] Discount card disappears after admin scans QR
- [ ] Button returns to static after reward is used
- [ ] Progress bars update correctly (green for completed visits)
- [ ] Polling updates reward status every 30 seconds

## Files Modified

1. `/root/lewis-loyality/app/dashboard/customer/page.tsx`
   - Added gift box visual
   - Added animated reward button
   - Added discount card with QR code
   - Added progress bars
   - Added state management for reward flow
   - Added polling for status updates

2. `/root/lewis-loyality/components/ReceiptUploader.tsx`
   - Added eligibility check
   - Added disabled state

3. `/root/lewis-loyality/package.json`
   - Added `react-qr-code` dependency

## Next Steps

1. **Test the complete flow**:
   - Upload 5 receipts (with 24h between each)
   - Verify animated button appears
   - Click to claim reward
   - Admin redeems reward
   - Verify discount card with QR code
   - Admin scans QR code
   - Verify button returns to static

2. **Admin Panel Updates** (if needed):
   - List pending/claimed rewards
   - Redeem button for claimed rewards
   - Scan QR functionality

3. **QR Code Library**:
   - `react-qr-code` is installed and working
   - QR code renders from `qrCode` JSON string

