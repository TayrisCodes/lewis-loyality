# PWA Implementation Plan - Lewis Loyalty App

## ✅ Completed Features

### 1. PWA Core Setup
- ✅ Created `manifest.json` with app metadata, icons, and shortcuts
- ✅ Added PWA meta tags to `layout.tsx`
- ✅ Created service worker (`sw.js`) for offline functionality
- ✅ Created `PWARegister` component to register service worker
- ✅ Created `PWAInstallPrompt` component with modern popup UI

### 2. Service Worker Features
- ✅ Asset caching (images, static files)
- ✅ Offline page support
- ✅ Cache-first strategy for static assets
- ✅ Network-first strategy for API calls
- ✅ Background sync support (structure ready)
- ✅ Push notification handlers

### 3. Install Prompt
- ✅ Modern, attractive popup design
- ✅ Auto-shows after 3 seconds (if installable)
- ✅ Dismiss functionality with 7-day cooldown
- ✅ Install button with smooth animations
- ✅ Feature highlights (offline, notifications, performance)

---

## 📋 Notification & Push Notification Scenarios

### Scenario 1: Receipt Accepted
**Trigger**: When a receipt is successfully verified and accepted
**Notification**:
- **Title**: "Receipt Accepted! 🎉"
- **Body**: "Your visit has been counted. You're one step closer to your reward!"
- **Action**: Navigate to `/dashboard/customer/rewards`
- **Priority**: High
- **When**: Immediately after receipt validation

### Scenario 2: Receipt Rejected
**Trigger**: When a receipt is rejected (invalid, duplicate, etc.)
**Notification**:
- **Title**: "Receipt Not Accepted"
- **Body**: "We couldn't verify your receipt. Please try again or contact support."
- **Action**: Navigate to `/customer-receipt`
- **Priority**: Normal
- **When**: Immediately after rejection

### Scenario 3: Reward Milestone Reached
**Trigger**: When customer reaches a visit milestone (e.g., 3rd, 5th visit)
**Notification**:
- **Title**: "Congratulations! 🎁"
- **Body**: "You've reached [X] visits! Claim your reward now."
- **Action**: Navigate to `/dashboard/customer/rewards`
- **Priority**: High
- **When**: Immediately after milestone visit is counted

### Scenario 4: Reward Available
**Trigger**: When a reward becomes available for redemption
**Notification**:
- **Title**: "Reward Ready! 🎉"
- **Body**: "You have a reward waiting for you. Visit us to claim it!"
- **Action**: Navigate to `/dashboard/customer/rewards`
- **Priority**: High
- **When**: When reward status changes to "available"

### Scenario 5: Visit Period Reminder
**Trigger**: When customer is close to period end (e.g., 5 days remaining)
**Notification**:
- **Title**: "Don't Miss Out! ⏰"
- **Body**: "You have [X] days left to complete your 5 visits. Visit us soon!"
- **Action**: Navigate to `/dashboard/customer`
- **Priority**: Normal
- **When**: Daily reminder starting 5 days before period end

### Scenario 6: Period Reset
**Trigger**: When a 45-day period ends without 5 visits
**Notification**:
- **Title**: "New Period Started"
- **Body**: "Your visit period has reset. Start earning rewards again!"
- **Action**: Navigate to `/dashboard/customer`
- **Priority**: Normal
- **When**: When period resets

### Scenario 7: Manual Review Complete
**Trigger**: When an admin completes manual review of a receipt
**Notification**:
- **Title**: "Receipt Reviewed"
- **Body**: "Your receipt has been reviewed. [Accepted/Rejected]"
- **Action**: Navigate to `/dashboard/customer/rewards`
- **Priority**: Normal
- **When**: When admin updates receipt status

---

## 🔔 Push Notification Implementation Plan

### Backend Requirements

1. **VAPID Keys Setup**
   - Generate VAPID keys for push notifications
   - Store public key in frontend
   - Store private key securely in backend

2. **Subscription Endpoint**
   - `POST /api/customer/push/subscribe`
   - Store subscription in database (customerId, endpoint, keys, expiration)
   - Validate subscription before storing

3. **Notification Sending Service**
   - Create notification service to send push notifications
   - Integrate with receipt processing workflow
   - Support batch notifications for multiple customers

4. **Notification Preferences**
   - `GET /api/customer/push/preferences` - Get user preferences
   - `PUT /api/customer/push/preferences` - Update preferences
   - Allow users to opt-in/opt-out of specific notification types

### Frontend Requirements

1. **Push Subscription Component**
   - Request notification permission
   - Subscribe to push service
   - Send subscription to backend
   - Handle subscription updates

2. **Notification Permission UI**
   - Show permission request prompt
   - Explain benefits of notifications
   - Handle permission denied gracefully

3. **Notification Settings Page**
   - Toggle notification types on/off
   - Test notification button
   - View notification history

---

## 📱 Offline Functionality Plan

### 1. Offline Receipt Upload
**Current Status**: Structure ready in service worker
**Implementation**:
- Store receipt images in IndexedDB when offline
- Queue upload requests when connection is restored
- Show pending uploads indicator in UI
- Auto-sync when back online

### 2. Offline Data Viewing
**Current Status**: Partially implemented (cached pages)
**Enhancements**:
- Cache customer dashboard data
- Cache rewards status
- Cache visit history
- Show "offline" indicator when viewing cached data

### 3. Offline Receipt Preview
**Current Status**: Not implemented
**Implementation**:
- Allow users to take photos offline
- Store photos locally
- Show preview of pending uploads
- Upload queue management UI

### 4. Background Sync
**Current Status**: Structure ready in service worker
**Implementation**:
- Use Background Sync API for receipt uploads
- Retry failed uploads automatically
- Show sync status in UI

---

## 🚀 Next Steps

### Phase 1: Notification Setup (Priority: High)
1. Generate VAPID keys
2. Create push subscription API endpoint
3. Create push subscription component
4. Test notification sending

### Phase 2: Notification Scenarios (Priority: High)
1. Implement receipt accepted notification
2. Implement receipt rejected notification
3. Implement reward milestone notification
4. Test all notification flows

### Phase 3: Offline Functionality (Priority: Medium)
1. Implement IndexedDB for receipt storage
2. Create offline upload queue UI
3. Implement background sync
4. Test offline scenarios

### Phase 4: Advanced Features (Priority: Low)
1. Notification preferences page
2. Notification history
3. Batch notification support
4. Analytics for notification engagement

---

## 🔧 Technical Notes

### Service Worker Location
- Service worker must be in `/public/sw.js` (root of public directory)
- Registration happens in `PWARegister` component

### Push Notification Requirements
- HTTPS required (or localhost for development)
- User permission required
- VAPID keys required for backend

### Browser Support
- Service Worker: Chrome, Firefox, Safari, Edge (modern versions)
- Push Notifications: Chrome, Firefox, Edge (Safari has limited support)
- Install Prompt: Chrome, Edge, Samsung Internet

### Testing Checklist
- [ ] Service worker registers successfully
- [ ] Assets cache correctly
- [ ] Offline page loads
- [ ] Install prompt appears
- [ ] App installs successfully
- [ ] Push notifications work
- [ ] Offline receipt upload works
- [ ] Background sync works




