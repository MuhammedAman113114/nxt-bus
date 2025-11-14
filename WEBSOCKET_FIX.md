# WebSocket Connection Fix

## Issue
WebSocket stuck on "Connecting..." and never connects.

## Root Cause
1. WebSocket service was missing the `emit()` method
2. Connection was not being awaited before emitting events
3. No timeout or error handling for connection failures

## Fixes Applied

### 1. Added `emit()` Method
```typescript
emit(event: string, data?: any) {
  if (!this.socket) {
    console.warn('Socket not connected, cannot emit:', event);
    return;
  }
  this.socket.emit(event, data);
}
```

### 2. Made `connect()` Return a Promise
```typescript
connect(): Promise<void> {
  return new Promise((resolve, reject) => {
    // ... connection logic
    this.socket.on('connect', () => {
      console.log('✓ WebSocket connected');
      resolve();
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
      reject(error);
    });
  });
}
```

### 3. Updated Driver Dashboard to Wait for Connection
```typescript
websocketService.connect()
  .then(() => {
    console.log('✅ WebSocket connected, starting tracking');
    websocketService.emit('driver:connect', {
      busId: selectedBus.id,
      routeId: selectedBus.routeId
    });
  })
  .catch((error) => {
    console.error('❌ WebSocket connection failed:', error);
    setError('Failed to connect to server');
    setConnectionStatus('disconnected');
  });
```

## Testing

### Check Browser Console (F12)
You should see:
```
✓ WebSocket connected
✅ WebSocket connected, starting tracking
```

If you see errors:
```
❌ WebSocket connection failed: [error message]
```

### Expected Behavior
1. Click "Start Ride"
2. Status changes to "Connecting..." (yellow)
3. Within 1-2 seconds: Status changes to "Connected" (green)
4. GPS starts tracking
5. Location updates sent to server

### If Still Not Connecting

**Check Backend is Running:**
```bash
cd backend
node test-api.js
```

**Check WebSocket Port:**
- Backend should be on: http://localhost:3000
- WebSocket connects to same port
- Check browser console for connection errors

**Check Token:**
```javascript
// In browser console:
console.log('Token:', localStorage.getItem('accessToken'));
```

**Check CORS:**
- Backend CORS should allow: http://localhost:5173
- Check backend/src/index.ts for CORS configuration

## Files Modified
- `frontend/src/services/websocket.service.ts` - Added emit() method and Promise-based connect()
- `frontend/src/pages/DriverDashboard.tsx` - Wait for connection before emitting

## Next Steps
1. Refresh browser (F5)
2. Login as driver
3. Select a bus
4. Click "Start Ride"
5. Check console for connection messages
6. Status should change to "Connected" (green)
