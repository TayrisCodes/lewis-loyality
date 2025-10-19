# 🔍 Login Debug Steps

## Current Status
All code changes are in place:
- ✅ Middleware role check fixed
- ✅ Cookie settings updated (sameSite: 'lax', path: '/')
- ✅ Login component using `window.location.href`

## Server Status
- ✅ Dev server restarted on port 3000
- ✅ All changes compiled

## Issue
Login succeeds (200 status) but redirects back to `/login` instead of dashboard.

---

## Debug Steps

### **Step 1: Clear Browser Cache**

**IMPORTANT: Your browser may have cached the old JavaScript!**

1. **Open DevTools** (F12)
2. **Right-click the Refresh button**
3. **Select "Empty Cache and Hard Reload"**
   
   OR
   
   Press: `Ctrl + Shift + Delete` (Windows/Linux) or `Cmd + Shift + Delete` (Mac)
   - Clear "Cached images and files"
   - Clear "Cookies and other site data"

### **Step 2: Open Browser Console**

1. Press **F12** to open DevTools
2. Go to **Console** tab
3. Keep it open while you test

### **Step 3: Test Login**

1. **Go to**: http://localhost:3000/login
2. **Clear the console** (click the 🚫 icon)
3. **Enter credentials**:
   - Email: `admin@lewisloyalty.com`
   - Password: `admin123`
4. **Click "Sign In"**
5. **Watch the console for these logs**:
   ```
   Login response: {user: {...}, token: "..."}
   Response headers: ...
   Redirecting to: /dashboard/super
   ```

### **Step 4: Check Network Tab**

1. Open **Network tab** in DevTools
2. Keep it open
3. Try logging in
4. Look for these requests:
   ```
   POST /api/super/auth/login   → Should be 200
   GET /dashboard/super         → What status?
   ```

### **Step 5: Check Cookies**

1. In DevTools, go to **Application** tab
2. Expand **Cookies** in left sidebar
3. Click on `http://localhost:3000`
4. Look for cookie named: `auth-token`
5. Check its properties:
   - Value: Should be a JWT token (long string)
   - Path: Should be `/`
   - HttpOnly: Should be checked
   - SameSite: Should be `Lax`

---

## What to Look For

### **If Redirect Fails:**

#### **Scenario A: No cookie set**
**Console shows**:
```
Login response: {user: {...}, token: "..."}
Redirecting to: /dashboard/super
```
**But no cookie in Application tab**

**Solution**: Backend not setting cookie properly
```bash
# Check backend logs for errors
```

#### **Scenario B: Cookie set but middleware blocks**
**Network tab shows**:
```
POST /api/super/auth/login   200 OK
GET /dashboard/super         307 Redirect to /login
```

**Solution**: Middleware not reading cookie
- Check if cookie has correct path
- Check if cookie has correct SameSite

#### **Scenario C: Old JavaScript cached**
**Console doesn't show new debug logs**:
```
# You should see:
Login response: ...
Response headers: ...
Redirecting to: ...
```

**Solution**: Hard refresh needed
- Press Ctrl+Shift+R
- Or clear cache and reload

---

## Quick Test Commands

### **Test 1: Check if cookie is set**
```bash
curl -c cookies.txt -X POST http://localhost:3000/api/super/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lewisloyalty.com","password":"admin123"}'

# Check cookies.txt for auth-token
cat cookies.txt
```

### **Test 2: Check if middleware allows access**
```bash
# Login and get cookie
curl -c cookies.txt -X POST http://localhost:3000/api/super/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lewisloyalty.com","password":"admin123"}'

# Try to access dashboard with cookie
curl -b cookies.txt -v http://localhost:3000/dashboard/super 2>&1 | grep -E "(HTTP|Location)"
```

---

## Expected Flow

### **Successful Login Flow:**
```
1. User enters credentials
   ↓
2. POST /api/super/auth/login
   ← 200 OK
   ← Set-Cookie: auth-token=...
   ← Response: {user: {...}, token: "..."}
   ↓
3. JavaScript: window.location.href = '/dashboard/super'
   ↓
4. Browser navigates to /dashboard/super WITH cookie
   ↓
5. Middleware checks auth-token cookie
   ↓
6. Middleware verifies JWT
   ↓
7. Middleware checks role = superadmin
   ↓
8. ✅ Allow access
   ↓
9. Dashboard loads
```

### **Current Problem (likely):**
```
1-3. Same as above ✅
   ↓
4. Browser navigates to /dashboard/super
   ↓
5. Middleware checks auth-token cookie
   ↓
6. ❌ Cookie not found OR invalid
   ↓
7. Redirect to /login
```

---

## Most Likely Causes

1. **Browser Cache** (Most common)
   - Old JavaScript still running
   - Solution: Hard refresh (Ctrl+Shift+R)

2. **Cookie Domain Mismatch**
   - Cookie set for wrong domain
   - Solution: Already fixed with `path: '/'`

3. **SameSite Policy**
   - Cookie not sent during redirect
   - Solution: Already fixed with `sameSite: 'lax'`

4. **Middleware Still Wrong**
   - Role check still buggy
   - Solution: Already fixed, but verify compilation

---

## Quick Fix: Force Browser Reload

The fastest solution is to force the browser to reload everything:

1. **Close all browser tabs** for localhost:3000
2. **Clear browser data**:
   - Settings → Privacy → Clear browsing data
   - Select: Cookies, Cached images and files
   - Time range: Last hour
3. **Restart browser** (completely quit and reopen)
4. **Open fresh tab**: http://localhost:3000/login
5. **Open DevTools** (F12) BEFORE logging in
6. **Try login again**

---

## If Still Not Working

Please share:
1. **Console logs** (what you see in browser console)
2. **Network tab** (screenshot of POST and GET requests)
3. **Cookies** (screenshot from Application → Cookies)
4. **Any error messages**

---

**Current Server**: http://localhost:3000
**Status**: All code changes applied ✅
**Next Step**: Clear browser cache and try again!

