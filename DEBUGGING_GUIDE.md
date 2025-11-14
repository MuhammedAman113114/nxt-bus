# Debugging Guide - Session & Display Issues

## Issues Fixed

### 1. ✅ Better Error Handling
- Added proper error checking for all API calls
- Added console logging to track data loading
- Improved error messages for debugging

### 2. ✅ Session Persistence
The authentication should already persist because:
- Tokens are stored in `localStorage`
- Each page checks `localStorage` on mount
- Only redirects to login if no token exists

## How to Debug

### Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for these messages:

**When loading admin dashboard:**
```
✅ Loaded buses: X
✅ Loaded routes: X
```

**When loading owners page:**
```
✅ Loaded owners: X
```

**If you see errors:**
```
❌ Error loading data: [error message]
```

### Check Network Tab

1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Look for API calls:
   - `/api/buses` - Should return 200
   - `/api/routes` - Should return 200
   - `/api/owners` - Should return 200

4. Click on each request to see:
   - **Headers**: Check if Authorization header is present
   - **Response**: Check if data is returned

### Check LocalStorage

1. Open DevTools → Application tab
2. Go to Storage → Local Storage
3. Check for these keys:
   - `accessToken` - Should have a JWT token
   - `refreshToken` - Should have a refresh token
   - `user` - Should have user data with role

**If these are missing**, you need to login again.

## Common Issues & Solutions

### Issue 1: "Items not displaying after adding"

**Symptoms**: Success message shows but list stays empty

**Debug Steps**:
1. Check console for "✅ Loaded X items" message
2. Check Network tab - does POST request return 201?
3. Check Network tab - does GET request after POST return data?

**Possible Causes**:
- Backend not returning data correctly
- Database not saving data
- Frontend not refreshing after add

**Solution**:
```bash
# Check backend logs
cd backend
# Look for any errors in the terminal

# Test API directly
node test-api.js

# Check database
node check-owners.js
```

### Issue 2: "Logged out on page refresh"

**Symptoms**: Refresh page → redirected to home/login

**Debug Steps**:
1. Before refresh: Check DevTools → Application → Local Storage
2. Verify `accessToken`, `refreshToken`, and `user` exist
3. After refresh: Check if they still exist
4. Check console for any errors

**Possible Causes**:
- LocalStorage being cleared
- Browser in incognito mode
- Service Worker interfering

**Solution**:
```javascript
// In browser console, check:
console.log('Token:', localStorage.getItem('accessToken'));
console.log('User:', localStorage.getItem('user'));

// If null, login again
```

### Issue 3: "Authorization errors"

**Symptoms**: 401 Unauthorized errors in Network tab

**Debug Steps**:
1. Check if token exists: `localStorage.getItem('accessToken')`
2. Check if token is being sent in headers
3. Check if token is expired

**Solution**:
```bash
# Login again to get fresh tokens
# Or check backend JWT_SECRET matches
```

## Testing Checklist

### Test Bus Management
- [ ] Login as admin
- [ ] Open browser console (F12)
- [ ] Go to Admin Dashboard
- [ ] Check console: Should see "✅ Loaded buses: X"
- [ ] Click "Add New Bus"
- [ ] Fill form and submit
- [ ] Check console: Should see "✅ Loaded buses: X+1"
- [ ] Verify bus appears in list

### Test Owners Management
- [ ] Click "Manage Owners"
- [ ] Check console: Should see "✅ Loaded owners: 2"
- [ ] Click "Add New Owner"
- [ ] Fill form and submit
- [ ] Check console: Should see "✅ Loaded owners: 3"
- [ ] Verify owner appears in list

### Test Session Persistence
- [ ] Login as admin
- [ ] Navigate to any admin page
- [ ] Press F5 to refresh
- [ ] Should stay on same page (not redirect)
- [ ] Check console for any errors
- [ ] Only logout when clicking "Logout" button

## Quick Fixes

### If nothing works:

1. **Clear everything and start fresh**:
```javascript
// In browser console:
localStorage.clear();
// Then login again
```

2. **Restart backend**:
```bash
cd backend
# Stop with Ctrl+C
npm run dev
```

3. **Check backend is running**:
```bash
cd backend
node test-api.js
```

4. **Check database has data**:
```bash
cd backend
node check-owners.js
```

## Expected Behavior

### After Login:
1. Tokens saved to localStorage
2. Redirected to appropriate dashboard
3. Can navigate between pages
4. Refresh keeps you logged in
5. Only logout on button click

### After Adding Item:
1. Success message appears
2. Form closes
3. List refreshes automatically
4. New item appears in list
5. Console shows updated count

## Need More Help?

1. Share console errors
2. Share Network tab screenshots
3. Share what you see vs what you expect
4. Check if backend is running: `node test-api.js`
