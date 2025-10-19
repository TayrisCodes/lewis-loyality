# Lewis Loyalty System - Testing Guide

## ✅ Database Setup - COMPLETED

The database has been successfully cleared and seeded with test data!

### Database Contents:
```
✅ Super Admins:          2
✅ Stores:                15 (13 active, 2 inactive)
✅ Store Admins:          13
✅ Reward Rules:          13
✅ Customers:             100
✅ Visits:                888 (realistic historical data)
✅ Rewards:               109 (32 unused, 77 used, 16 expired)
```

---

## 🧪 COMPREHENSIVE TESTING CHECKLIST

### 1. Super Admin Authentication ✅

**Test Steps:**
```bash
1. Navigate to: http://localhost:3000/login
2. Enter credentials:
   Email: admin@lewisloyalty.com
   Password: admin123
3. Check "Remember me" (optional)
4. Click "Sign In"
```

**Expected Results:**
- ✅ Login successful
- ✅ JWT token set in HTTP-only cookie
- ✅ User info stored in localStorage
- ✅ Redirected to `/dashboard/super`
- ✅ Dashboard shows:
  - Total Stores: 15
  - Total Admins: 13
  - Total Customers: 100
  - Total Visits: 888
  - Rewards Given: 109
  - Charts with visit data
  - Top stores table

**Test Middleware Protection:**
```bash
5. Try to access: http://localhost:3000/dashboard/admin
```
**Expected Result:** ❌ Redirect to `/dashboard/super` (role mismatch)

---

### 2. Store Admin Authentication ✅

**Test Steps:**
```bash
1. Logout from super admin
2. Navigate to: http://localhost:3000/login
3. Enter credentials:
   Email: admin1@lewisloyalty.com
   Password: admin123
4. Click "Sign In"
```

**Expected Results:**
- ✅ Login successful
- ✅ Redirected to `/dashboard/admin`
- ✅ Dashboard shows store-specific data:
  - Store name: Lewis Coffee - Bole
  - Today's visits count
  - Total customers
  - Rewards issued
  - Current QR code with token
  - Recent visits table

**Test Middleware Protection:**
```bash
5. Try to access: http://localhost:3000/dashboard/super
```
**Expected Result:** ❌ Redirect to `/dashboard/admin` (role mismatch)

---

### 3. Protected Routes - Unauthenticated Access

**Test Steps:**
```bash
1. Logout (or open incognito window)
2. Try to access: http://localhost:3000/dashboard/super
3. Try to access: http://localhost:3000/dashboard/admin
```

**Expected Results:**
- ✅ Both redirect to `/login`
- ✅ No access to dashboard without authentication

---

### 4. API Endpoint Authentication

#### Test Super Admin API
```bash
# While logged in as super admin:
curl -v http://localhost:3000/api/super/analytics \
  -H "Cookie: auth-token=YOUR_TOKEN"
```

**Expected Result:** ✅ Returns analytics data

#### Test Store Admin API
```bash
# While logged in as store admin:
curl -v http://localhost:3000/api/admin/store \
  -H "Cookie: auth-token=YOUR_TOKEN"
```

**Expected Result:** ✅ Returns store data

#### Test Unauthorized Access
```bash
# Without token:
curl -v http://localhost:3000/api/super/analytics
```

**Expected Result:** ❌ 401 Unauthorized

---

### 5. Super Admin Features Testing

#### A. View Analytics
```bash
1. Login as super admin
2. Dashboard should show:
   ✅ Summary cards (stores, admins, customers, visits, rewards)
   ✅ Daily Visits chart (last 7 days)
   ✅ Top Stores table
```

#### B. View All Stores
```bash
1. Click "Stores" in sidebar
2. Navigate to: /dashboard/super/stores
3. Verify:
   ✅ Shows all 15 stores
   ✅ Stats: Total, Active, With Admins
   ✅ Table with store details
   ✅ QR expiration dates
   ✅ Active/Inactive badges
```

#### C. Create New Store
```bash
1. Click "Create Store" button
2. Fill in:
   - Name: Lewis Coffee - Test Store
   - Address: 123 Test Street
3. Click "Create Store"
4. Verify:
   ✅ Store created successfully
   ✅ QR code generated automatically
   ✅ Appears in stores list
```

#### D. Regenerate QR Code
```bash
1. Find any store in the list
2. Click "Regenerate QR" button
3. Verify:
   ✅ New QR code generated
   ✅ New token created
   ✅ Expiration date updated
   ✅ Old QR becomes invalid
```

#### E. View All Admins
```bash
1. Click "Admins" in sidebar
2. Navigate to: /dashboard/super/admins
3. Verify:
   ✅ Shows all 13 store admins
   ✅ Stats: Total, Active, Assigned, Unassigned
   ✅ Table with admin details
   ✅ Last login dates
   ✅ Assigned stores
```

#### F. Create New Admin
```bash
1. Click "Create Admin" button
2. Fill in:
   - Name: Test Admin
   - Email: testadmin@lewisloyalty.com
   - Password: test123
   - Store: (select unassigned store)
3. Click "Create Admin"
4. Verify:
   ✅ Admin created successfully
   ✅ Can login with new credentials
   ✅ Assigned to selected store
```

---

### 6. Store Admin Features Testing

#### A. View Dashboard
```bash
1. Login as: admin1@lewisloyalty.com
2. Verify dashboard shows:
   ✅ Store name and address
   ✅ Today's visits (realistic number)
   ✅ Total customers
   ✅ Rewards issued
   ✅ Current QR code image
   ✅ QR token and expiration
   ✅ Recent visits table (10 most recent)
```

#### B. View All Customers
```bash
1. Click "Customers" in sidebar
2. Navigate to: /dashboard/admin/customers
3. Verify:
   ✅ Shows store customers
   ✅ Stats: Total, Total Visits, Rewards Earned
   ✅ Search by name/phone works
   ✅ Customer details (name, phone, visits, rewards)
```

#### C. View All Visits
```bash
1. Click "Visits" in sidebar
2. Navigate to: /dashboard/admin/visits
3. Verify:
   ✅ Shows all store visits
   ✅ Customer name and phone
   ✅ Visit timestamp
   ✅ Reward earned badge
   ✅ Can filter by date
```

#### D. View Rewards
```bash
1. Click "Rewards" in sidebar
2. Navigate to: /dashboard/admin/rewards
3. Verify:
   ✅ Shows reward configuration
   ✅ Lists issued rewards
   ✅ Reward status (unused/used/expired)
```

#### E. Regenerate QR Code
```bash
1. From dashboard, click "Regenerate QR"
2. Verify:
   ✅ New QR code appears
   ✅ New token generated
   ✅ Expiration updated
```

#### F. Print QR Code
```bash
1. Click "Print QR" button
2. Verify:
   ✅ Opens print-friendly page
   ✅ Shows large QR code
   ✅ Shows store name
   ✅ Shows instructions
   ✅ Can print properly
```

---

### 7. Customer Flow Testing

#### A. First Time Customer Registration
```bash
1. Get QR code URL from any active store:
   - Method 1: Scan QR code with phone
   - Method 2: Navigate to: http://localhost:3000/customer?storeId=STORE_ID&token=TOKEN
   
2. Should show registration form:
   ✅ Store name displayed
   ✅ Phone number input
   ✅ Name input
   ✅ WhatsApp opt-in checkbox

3. Fill in and submit:
   - Phone: +251911234567
   - Name: Test Customer
   
4. Verify:
   ✅ Registration successful
   ✅ Visit recorded (1/X visits)
   ✅ Progress bar shows
   ✅ Welcome message displays
```

#### B. Return Customer Visit
```bash
1. Use same phone number again
2. Scan QR or access same URL
3. Verify:
   ✅ Recognizes customer
   ✅ Visit recorded automatically
   ✅ Visit count incremented
   ✅ Progress to reward shown
```

#### C. Reward Earning
```bash
1. Use customer with enough visits (check database)
   Example: Phone: +2510971000000 (has 34 visits)
   
2. Verify:
   ✅ If visits match reward rule, reward earned
   ✅ Reward notification shown
   ✅ Confetti animation (optional)
   ✅ Reward appears in admin dashboard
```

#### D. Invalid QR Code
```bash
1. Try to access with expired/invalid token:
   http://localhost:3000/customer?storeId=xxx&token=invalid
   
2. Verify:
   ✅ Error message shown
   ✅ Prompts to get new QR
```

---

### 8. Session Management Testing

#### A. Remember Me Feature
```bash
Test with Remember Me CHECKED:
1. Login with "Remember me" checked
2. Close browser completely
3. Reopen browser
4. Navigate to dashboard
   ✅ Should still be logged in

Test with Remember Me UNCHECKED:
1. Login without "Remember me"
2. Close browser
3. Reopen browser
4. Navigate to dashboard
   ❌ Should redirect to login
```

#### B. Logout Functionality
```bash
1. Click "Logout" in sidebar
2. Verify:
   ✅ Redirected to /login
   ✅ Cookie cleared
   ✅ localStorage/sessionStorage cleared
   ✅ Cannot access dashboard
   ✅ Must login again
```

#### C. Token Expiration
```bash
Note: JWT tokens expire after 24 hours

To test (advanced):
1. Login and note the time
2. Wait 24+ hours OR manually invalidate token
3. Try to access dashboard
   ✅ Should redirect to login
   ✅ Shows "session expired" (if implemented)
```

---

### 9. Error Handling Testing

#### A. Invalid Login Credentials
```bash
1. Try to login with wrong password:
   Email: admin@lewisloyalty.com
   Password: wrongpassword
   
2. Verify:
   ✅ Error message displayed
   ✅ No redirect
   ✅ Can retry
```

#### B. Network Errors
```bash
1. Stop the server
2. Try to load dashboard
3. Verify:
   ✅ Error message shown
   ✅ Graceful handling
```

#### C. Invalid Data Submission
```bash
1. Try to create store with empty name
2. Verify:
   ✅ Validation error shown
   ✅ Form highlights error
```

---

### 10. Mobile Responsiveness Testing

Test on different screen sizes:

#### Desktop (1920x1080)
```
✅ Sidebar visible by default
✅ All charts display properly
✅ Tables are readable
✅ Forms are well-spaced
```

#### Tablet (768x1024)
```
✅ Sidebar collapsible
✅ Charts responsive
✅ Tables scrollable
✅ Touch-friendly buttons
```

#### Mobile (375x667)
```
✅ Hamburger menu for sidebar
✅ Cards stack vertically
✅ Forms are touch-friendly
✅ QR codes are large enough
✅ Tables scroll horizontally
```

---

## 🎯 CRITICAL TESTS SUMMARY

### Must Pass:
- ✅ Super admin login works
- ✅ Store admin login works
- ✅ Middleware protects routes
- ✅ API calls include credentials
- ✅ Logout clears session
- ✅ Role-based access control works
- ✅ Customer can register
- ✅ Visits are recorded
- ✅ Rewards are earned correctly

---

## 📊 TEST DATA AVAILABLE

### Super Admins (2):
```
1. admin@lewisloyalty.com / admin123
2. manager@lewisloyalty.com / admin123
```

### Store Admins (13):
```
admin1@lewisloyalty.com / admin123 - Lewis Coffee - Bole
admin2@lewisloyalty.com / admin123 - Lewis Coffee - Piassa
admin3@lewisloyalty.com / admin123 - Lewis Coffee - Meskel Square
... (admin4 through admin13)
```

### Stores (15):
```
13 Active Stores with QR codes
2 Inactive Stores (for testing inactive states)
```

### Customers (100):
```
Real Ethiopian names
Phone numbers: +25109X1XXXXXX
Varied visit history (0-34 visits)
Realistic date distribution
```

### Visits (888):
```
Distributed over last 90 days
Includes weekday/weekend patterns
Some visits earned rewards
Realistic time patterns
```

---

## 🐛 KNOWN ISSUES TO CHECK

1. **QR Code Generation**
   - Check if QR images are created in `/public/qrcodes/`
   - Verify QR codes scan properly with phone

2. **WhatsApp Integration**
   - May not work without WhatsApp configuration
   - Should gracefully handle missing config

3. **Timezone Issues**
   - Check if dates display correctly in your timezone
   - Verify "today's visits" calculation is accurate

---

## 🔍 DEBUGGING TIPS

### Check Server Logs
```bash
# Server is running on port 3000
# Check terminal for errors
# Look for API request logs
```

### Check Browser Console
```bash
# Open DevTools (F12)
# Check Console for errors
# Check Network tab for failed requests
# Check Application > Cookies for auth-token
```

### Check Database
```bash
# Connect to MongoDB
# Verify collections have data
mongosh mongodb://admin:password123@localhost:27020/lewis-loyalty?authSource=admin

# Check user count
db.users.count()

# Check store count
db.stores.count()

# Check visits count
db.visits.count()
```

---

## ✅ POST-TESTING CLEANUP

After testing, you may want to:

### Reset Database
```bash
npm run reset-db:full
```

### Clear Only Data (Keep Schema)
```bash
npm run clear-db
```

### Reseed with Fresh Data
```bash
npm run seed:comprehensive
```

---

## 📝 TEST RESULTS TEMPLATE

Use this to document your testing:

```
Date: _______________
Tester: _____________

AUTHENTICATION TESTS:
[ ] Super Admin Login: _____ (Pass/Fail)
[ ] Store Admin Login: _____ (Pass/Fail)
[ ] Protected Routes: _____ (Pass/Fail)
[ ] Logout: _____ (Pass/Fail)

SUPER ADMIN TESTS:
[ ] View Dashboard: _____ (Pass/Fail)
[ ] Create Store: _____ (Pass/Fail)
[ ] Create Admin: _____ (Pass/Fail)
[ ] Regenerate QR: _____ (Pass/Fail)

STORE ADMIN TESTS:
[ ] View Dashboard: _____ (Pass/Fail)
[ ] View Customers: _____ (Pass/Fail)
[ ] View Visits: _____ (Pass/Fail)
[ ] Print QR: _____ (Pass/Fail)

CUSTOMER TESTS:
[ ] Registration: _____ (Pass/Fail)
[ ] Return Visit: _____ (Pass/Fail)
[ ] Earn Reward: _____ (Pass/Fail)

ISSUES FOUND:
1. _______________________
2. _______________________
3. _______________________

NOTES:
_________________________
_________________________
```

---

## 🎉 SUCCESS CRITERIA

Your system is working correctly if:

✅ All login flows work smoothly
✅ Middleware protects routes properly
✅ API calls authenticate correctly
✅ Dashboard data displays accurately
✅ QR codes generate and scan properly
✅ Customer registration works
✅ Visits are recorded correctly
✅ Rewards are earned at right thresholds
✅ No console errors
✅ Mobile responsive
✅ Logout clears session
✅ Session persistence works (Remember Me)

---

**Ready to Test!** 🚀

Start here: http://localhost:3000/login

Good luck! 🍀



