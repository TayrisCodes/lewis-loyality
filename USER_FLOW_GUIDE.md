# Lewis Loyalty System - Complete User Flow Guide

## System Overview

The Lewis Loyalty System has **THREE** main user types:
1. **Super Admin** - System-wide management
2. **Store Admin** - Individual store management  
3. **Customer** - Loyalty program participants

---

## 🔐 AUTHENTICATION FLOW

### Super Admin Login
```
1. Navigate to: http://localhost:3000/login
2. Enter credentials:
   - Email: admin@lewisloyalty.com
   - Password: admin123
3. System validates credentials → Creates JWT token
4. Token stored in HTTP-only cookie
5. User info stored in localStorage
6. Redirected to: /dashboard/super
```

### Store Admin Login
```
1. Navigate to: http://localhost:3000/login
2. Enter credentials:
   - Email: admin1@lewisloyalty.com (or admin2, admin3, etc.)
   - Password: admin123
3. System validates credentials → Creates JWT token
4. Token stored in HTTP-only cookie
5. User info stored in localStorage
6. Redirected to: /dashboard/admin
```

### Customer Flow (No Login Required)
```
1. Navigate to: http://localhost:3000/customer
2. Scan QR code at store OR enter phone number
3. System validates/registers customer
4. Records visit and checks for rewards
```

---

## 👑 SUPER ADMIN WORKFLOWS

### Access Super Admin Dashboard
**URL**: `/dashboard/super`

**Features Available**:
- View system-wide analytics
- Manage all stores
- Manage all admins
- View total customers & visits
- Generate reports

### Manage Stores

#### View All Stores
```
1. Dashboard shows top 5 stores
2. Click "View All Stores" → /dashboard/super/stores
3. See list of all stores with:
   - Store name & address
   - Assigned admin
   - Active/Inactive status
   - QR code expiration date
```

#### Create New Store
```
1. Click "Create Store" button
2. Fill in form:
   - Store name
   - Address
   - Optional: Assign admin
3. Submit
4. System automatically:
   - Creates store
   - Generates QR code
   - Sets expiration (24 hours from now)
```

#### Regenerate QR Code
```
1. Find store in list
2. Click "Regenerate QR" button
3. System generates new daily QR code
4. Old QR becomes invalid
```

### Manage Admins

#### View All Admins
```
1. Click "Admins" in sidebar
2. Navigate to: /dashboard/super/admins
3. See list of all admins with:
   - Name & email
   - Assigned store
   - Active status
   - Last login date
```

#### Create New Admin
```
1. Click "Create Admin" button
2. Fill in form:
   - Name
   - Email
   - Password
   - Optional: Assign store
3. Submit
4. Admin can now login with credentials
```

### View Analytics
```
1. Click "Analytics" in sidebar (future feature)
2. View detailed reports:
   - Daily/Monthly visits
   - Reward distribution
   - Top performing stores
   - Customer growth trends
```

---

## 🏪 STORE ADMIN WORKFLOWS

### Access Admin Dashboard
**URL**: `/dashboard/admin`

**Features Available**:
- View store-specific data
- Manage store QR code
- View customers
- View visits
- Manage rewards

### View Dashboard Overview
```
Dashboard displays:
- Today's visit count
- Total customers
- Rewards issued
- Store status
- Current daily QR code
```

### Manage QR Code

#### View Current QR Code
```
1. Dashboard shows current daily QR code
2. Displays:
   - QR code image
   - Token
   - Expiration time
```

#### Regenerate QR Code
```
1. Click "Regenerate QR" button
2. New QR code generated immediately
3. Old QR becomes invalid
4. Display updates with new QR
```

#### Print QR Code
```
1. Click "Print QR" button
2. Opens print-friendly page
3. Print and display in store
```

### View Customers

```
1. Click "Customers" in sidebar
2. Navigate to: /dashboard/admin/customers
3. View list of all store customers:
   - Name & phone
   - Total visits
   - Last visit date
   - Rewards earned
   - Member since date
4. Search by name or phone number
```

### View Visits

```
1. Click "Visits" in sidebar
2. Navigate to: /dashboard/admin/visits
3. View recent visits:
   - Customer name & phone
   - Visit timestamp
   - Reward earned (yes/no)
4. Filter by date
```

### Manage Rewards

```
1. Click "Rewards" in sidebar
2. Navigate to: /dashboard/admin/rewards
3. View reward configuration:
   - Visits needed for reward
   - Reward value
4. View issued rewards:
   - Customer
   - Reward details
   - Issue date
   - Redeemed status
```

---

## 👥 CUSTOMER WORKFLOWS

### Access Customer Portal
**URL**: `/customer` or `/customer?storeId=xxx&token=yyy`

### First Visit - Registration

```
1. Customer arrives at store
2. Scans QR code → Opens /customer with store info
3. System prompts for:
   - Full name
   - Phone number
   - WhatsApp consent (optional)
4. Submit
5. System:
   - Creates customer record
   - Records first visit
   - Shows visit count (1)
   - Shows progress to next reward
```

### Return Visit - Existing Customer

```
1. Customer scans QR code
2. System recognizes phone number OR asks for it
3. System:
   - Records visit
   - Increments visit count
   - Checks reward rule
4. If reward earned:
   - Shows reward notification
   - Creates reward record
   - Sends WhatsApp message (if enabled)
5. Displays:
   - Total visits
   - Rewards earned
   - Progress to next reward
```

### Alternative: Manual Phone Entry

```
If QR scan fails:
1. Navigate to /customer
2. Enter phone number
3. Select store (if multiple locations)
4. Follow registration/visit flow above
```

---

## 🔄 DAILY QR CODE REGENERATION

### Automatic Process (Cron Job)
```
1. Every day at midnight (configurable)
2. System automatically:
   - Generates new QR tokens for all stores
   - Creates new QR code images
   - Updates expiration dates
   - Old QR codes become invalid
```

### Manual Regeneration
```
Both Super Admin and Store Admin can regenerate QR:
1. Click "Regenerate QR" button
2. Immediate regeneration
3. Use case: QR code compromised or damaged
```

---

## 🎁 REWARD SYSTEM FLOW

### How Rewards Work

```
1. Each store has a Reward Rule:
   - Example: "5 visits = Free Coffee"
   
2. Customer visits are tracked:
   - Visit 1: 1/5 visits
   - Visit 2: 2/5 visits
   - Visit 5: ✅ REWARD EARNED!
   
3. When reward threshold reached:
   - System creates Reward record
   - Customer notified on screen
   - WhatsApp message sent (if enabled)
   - Admin sees reward in dashboard
   
4. Reward redemption:
   - Customer shows reward on phone
   - Store admin verifies
   - Marks as redeemed
   - Counter resets for next reward
```

---

## 🔐 SECURITY & AUTHENTICATION

### Token-Based Security

```
1. Login → JWT Token Created
2. Token stored in HTTP-only cookie (secure)
3. Cookie automatically sent with every request
4. Server validates token on each API call
5. Invalid/expired token → Redirect to login
```

### Role-Based Access Control

```
Super Admin can access:
✅ /dashboard/super/*
✅ /api/super/*
❌ /dashboard/admin (will redirect)

Store Admin can access:
✅ /dashboard/admin/*
✅ /api/admin/*
❌ /dashboard/super (will redirect)

Customer:
✅ /customer
✅ /api/customer/*
✅ /api/visit/*
(No login required)
```

### Middleware Protection

```
All /dashboard/* routes protected by middleware:
1. Checks for auth-token cookie
2. Validates JWT token
3. Checks user role matches route
4. Allows access or redirects
```

---

## 🚨 ERROR HANDLING

### Authentication Errors

```
401 Unauthorized:
- Token missing/invalid
- → Clear local storage
- → Redirect to /login

403 Forbidden:
- Valid token but wrong role
- → Redirect to correct dashboard
```

### API Errors

```
400 Bad Request:
- Invalid input data
- → Show error message to user

404 Not Found:
- Resource doesn't exist
- → Show "not found" message

500 Internal Server Error:
- Server error
- → Show "try again" message
- → Log error for debugging
```

---

## 📱 MOBILE RESPONSIVENESS

All pages are mobile-responsive:
- Dashboard: Collapsible sidebar on mobile
- Customer portal: Optimized for phone scanning
- QR codes: Large enough to scan easily
- Tables: Scrollable on small screens

---

## 🔄 SESSION MANAGEMENT

### Remember Me Feature

```
Remember Me CHECKED:
- User info stored in localStorage
- Persists across browser sessions
- Manual logout required

Remember Me UNCHECKED:
- User info stored in sessionStorage
- Clears when browser closes
- Better for shared computers
```

### Logout Flow

```
1. User clicks "Logout"
2. System:
   - Calls /api/auth/logout
   - Clears auth-token cookie
   - Clears localStorage/sessionStorage
   - Redirects to /login
```

---

## 🎯 QUICK START CHECKLIST

### For Super Admin:
- [ ] Login to /login
- [ ] View dashboard analytics
- [ ] Create/manage stores
- [ ] Create/manage admins
- [ ] Monitor system health

### For Store Admin:
- [ ] Login to /login
- [ ] View store dashboard
- [ ] Print daily QR code
- [ ] Monitor today's visits
- [ ] Check reward redemptions

### For Store Setup:
- [ ] Create store in system
- [ ] Assign admin to store
- [ ] Generate initial QR code
- [ ] Print and display QR
- [ ] Train staff on system

---

## 📞 TEST CREDENTIALS

### Super Admin
```
Email: admin@lewisloyalty.com
Password: admin123
```

### Store Admins (examples)
```
Email: admin1@lewisloyalty.com
Email: admin2@lewisloyalty.com
Email: admin3@lewisloyalty.com
Password: admin123 (all)
```

### Test Customers
```
Use any phone number in format:
+251911234567 (Ethiopia)
+251921234567
etc.
```

---

## 🐛 TROUBLESHOOTING

### "Unauthorized" Error
→ Token expired or invalid
→ Solution: Logout and login again

### QR Code Not Working
→ May be expired (daily rotation)
→ Solution: Regenerate QR code

### Can't Create Store/Admin
→ May be unauthorized
→ Solution: Check you're logged in as Super Admin

### Dashboard Not Loading
→ May be database connection issue
→ Solution: Check MongoDB is running

### Customer Can't Register
→ Phone number may be invalid
→ Solution: Use correct format (+251...)

---

## 📚 API ENDPOINTS

### Authentication
```
POST /api/super/auth/login - Super admin login
POST /api/admin/auth/login - Store admin login
POST /api/auth/logout - Logout (any role)
```

### Super Admin APIs
```
GET  /api/super/analytics - System analytics
GET  /api/super/stores - List all stores
POST /api/super/stores - Create store
POST /api/super/stores/:id/generate-qr - Regenerate QR
GET  /api/super/admins - List all admins
POST /api/super/admins - Create admin
```

### Store Admin APIs
```
GET /api/admin/store - Get store info
GET /api/admin/customers - List customers
GET /api/admin/visits - List visits
GET /api/admin/rewards - List rewards
POST /api/admin/store/generate-qr - Regenerate QR
```

### Customer APIs (Public)
```
POST /api/customer/check - Check customer exists
POST /api/customer/register - Register new customer
POST /api/customer/scan - Record visit
POST /api/customer/validate-qr - Validate QR code
POST /api/v2/visit/record - Record visit (v2)
```

---

## 🎨 USER INTERFACE HIGHLIGHTS

### Modern Design Features:
- ✨ Animated card effects
- 🌈 Gradient backgrounds
- 🎯 Clean typography
- 📊 Interactive charts
- 🎭 Smooth transitions
- 📱 Mobile-first design
- 🌙 Dark mode ready (theme toggle)

---

**Last Updated**: Today
**Version**: 2.0 with Fixed Authentication
**Support**: admin@lewisloyalty.com



